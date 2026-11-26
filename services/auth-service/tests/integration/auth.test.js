const request = require('supertest');
const app = require('../../src/app');
const db = require('../../src/db');
const { ensureAdmin } = require('../../src/controllers/authController');

const sara = { name: 'Sara', email: 'sara@test.com', password: 'secret123' };

beforeAll(async () => {
  await db.migrate();
});

beforeEach(async () => {
  await db.query('TRUNCATE users RESTART IDENTITY');
});

afterAll(async () => {
  await db.close();
});

async function loginAs(email, password) {
  const res = await request(app).post('/api/auth/login').send({ email, password });
  return res.body.token;
}

describe('health', () => {
  test('/health says ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  test('/ready says the database is reachable', async () => {
    const res = await request(app).get('/ready');
    expect(res.status).toBe(200);
    expect(res.body.database).toBe(true);
  });
});

describe('sign up', () => {
  test('creates a normal user and never returns the password', async () => {
    const res = await request(app).post('/api/auth/register').send(sara);
    expect(res.status).toBe(201);
    expect(res.body.user).toMatchObject({ name: 'Sara', email: 'sara@test.com', role: 'user' });
    expect(JSON.stringify(res.body)).not.toContain('secret123');
    expect(res.body.user.password_hash).toBeUndefined();
  });

  test('stores a scrambled password in the database, not the real one', async () => {
    await request(app).post('/api/auth/register').send(sara);
    const { rows } = await db.query('SELECT password_hash FROM users WHERE email = $1', [sara.email]);
    expect(rows[0].password_hash).not.toBe(sara.password);
  });

  test('cannot make yourself admin while signing up', async () => {
    const res = await request(app).post('/api/auth/register').send({ ...sara, role: 'admin' });
    expect(res.body.user.role).toBe('user');
  });

  test('rejects the same email twice', async () => {
    await request(app).post('/api/auth/register').send(sara);
    const res = await request(app).post('/api/auth/register').send({ ...sara, email: 'SARA@test.com' });
    expect(res.status).toBe(409);
  });

  test('rejects a missing field', async () => {
    const res = await request(app).post('/api/auth/register').send({ email: 'x@test.com' });
    expect(res.status).toBe(400);
  });
});

describe('login', () => {
  beforeEach(async () => {
    await request(app).post('/api/auth/register').send(sara);
  });

  test('returns a token for valid credentials', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: sara.email, password: sara.password });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
  });

  test('wrong password is refused', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: sara.email, password: 'wrong-pass' });
    expect(res.status).toBe(401);
  });

  test('unknown email gets the same answer as wrong password', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'nobody@test.com', password: 'whatever1' });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Wrong email or password');
  });
});

describe('who am I', () => {
  test('returns the user for a valid token', async () => {
    await request(app).post('/api/auth/register').send(sara);
    const token = await loginAs(sara.email, sara.password);
    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe(sara.email);
  });

  test('rejects a missing token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  test('rejects an invalid token', async () => {
    const res = await request(app).get('/api/auth/me').set('Authorization', 'Bearer fake.token.here');
    expect(res.status).toBe(401);
  });
});

describe('admin vs normal user', () => {
  beforeEach(async () => {
    await ensureAdmin({ email: 'admin@shop.com', password: 'admin-pass-123' });
    await request(app).post('/api/auth/register').send(sara);
  });

  test('a normal user cannot see the list of users', async () => {
    const token = await loginAs(sara.email, sara.password);
    const res = await request(app).get('/api/auth/users').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  test('an admin can see the list of users', async () => {
    const token = await loginAs('admin@shop.com', 'admin-pass-123');
    const res = await request(app).get('/api/auth/users').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.users).toHaveLength(2);
  });

  test('an admin can promote a user to admin', async () => {
    const token = await loginAs('admin@shop.com', 'admin-pass-123');
    const res = await request(app)
      .patch('/api/auth/users/2/role')
      .set('Authorization', `Bearer ${token}`)
      .send({ role: 'admin' });
    expect(res.status).toBe(200);
    expect(res.body.user.role).toBe('admin');
  });

  test('a normal user cannot promote anyone', async () => {
    const token = await loginAs(sara.email, sara.password);
    const res = await request(app)
      .patch('/api/auth/users/2/role')
      .set('Authorization', `Bearer ${token}`)
      .send({ role: 'admin' });
    expect(res.status).toBe(403);
  });
});
