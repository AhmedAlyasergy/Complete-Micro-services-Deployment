const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../../src/app');
const db = require('../../src/db');

const adminToken = jwt.sign({ sub: 1, email: 'admin@shop.com', role: 'admin' }, process.env.JWT_SECRET);
const userToken = jwt.sign({ sub: 2, email: 'sara@test.com', role: 'user' }, process.env.JWT_SECRET);
const fakeToken = jwt.sign({ sub: 1, role: 'admin' }, 'hacker-secret');

const asAdmin = (req) => req.set('Authorization', `Bearer ${adminToken}`);
const asUser = (req) => req.set('Authorization', `Bearer ${userToken}`);

async function addProduct(data = { name: 'Laptop', price: 1000, stock: 5 }) {
  const res = await asAdmin(request(app).post('/api/products')).send(data);
  return res.body.product;
}

beforeAll(async () => {
  await db.migrate();
});

beforeEach(async () => {
  await db.query('TRUNCATE products RESTART IDENTITY');
});

afterAll(async () => {
  await db.close();
});

describe('health', () => {
  test('/health and /ready answer', async () => {
    expect((await request(app).get('/health')).status).toBe(200);
    const ready = await request(app).get('/ready');
    expect(ready.status).toBe(200);
    expect(ready.body.database).toBe(true);
  });
});

describe('browsing (anyone)', () => {
  test('lists products with paging info', async () => {
    for (let i = 1; i <= 12; i += 1) await addProduct({ name: `Item ${i}`, price: i, stock: 1 });
    const res = await request(app).get('/api/products?page=2&limit=5');
    expect(res.status).toBe(200);
    expect(res.body.products).toHaveLength(5);
    expect(res.body).toMatchObject({ page: 2, limit: 5, total: 12 });
  });

  test('shows one product', async () => {
    const p = await addProduct();
    const res = await request(app).get(`/api/products/${p.id}`);
    expect(res.status).toBe(200);
    expect(res.body.product).toMatchObject({ name: 'Laptop', price: 1000, stock: 5 });
  });

  test('unknown product gives 404, bad id gives 400', async () => {
    expect((await request(app).get('/api/products/999')).status).toBe(404);
    expect((await request(app).get('/api/products/abc')).status).toBe(400);
  });
});

describe('managing products (admin only)', () => {
  test('admin can add a product', async () => {
    const res = await asAdmin(request(app).post('/api/products')).send({ name: 'Phone', price: 500, stock: 10 });
    expect(res.status).toBe(201);
    expect(res.body.product).toMatchObject({ name: 'Phone', price: 500, stock: 10 });
  });

  test('a normal user cannot add a product', async () => {
    const res = await asUser(request(app).post('/api/products')).send({ name: 'Phone', price: 500 });
    expect(res.status).toBe(403);
  });

  test('missing or invalid token cannot add a product', async () => {
    expect((await request(app).post('/api/products').send({ name: 'Phone', price: 500 })).status).toBe(401);
    const fake = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${fakeToken}`)
      .send({ name: 'Phone', price: 500 });
    expect(fake.status).toBe(401);
  });

  test('bad product data is rejected', async () => {
    const res = await asAdmin(request(app).post('/api/products')).send({ name: 'Phone', price: -5 });
    expect(res.status).toBe(400);
  });

  test('admin can edit only the price', async () => {
    const p = await addProduct();
    const res = await asAdmin(request(app).put(`/api/products/${p.id}`)).send({ price: 899.99 });
    expect(res.status).toBe(200);
    expect(res.body.product).toMatchObject({ name: 'Laptop', price: 899.99, stock: 5 });
  });

  test('a normal user cannot edit or delete', async () => {
    const p = await addProduct();
    expect((await asUser(request(app).put(`/api/products/${p.id}`)).send({ price: 1 })).status).toBe(403);
    expect((await asUser(request(app).delete(`/api/products/${p.id}`))).status).toBe(403);
  });

  test('admin can delete a product', async () => {
    const p = await addProduct();
    expect((await asAdmin(request(app).delete(`/api/products/${p.id}`))).status).toBe(204);
    expect((await request(app).get(`/api/products/${p.id}`)).status).toBe(404);
  });
});

describe('stock (used by Orders)', () => {
  const withKey = (req) => req.set('x-internal-key', 'test-internal-key');

  test('Orders (with the internal key) can lower stock', async () => {
    const p = await addProduct();
    const res = await withKey(request(app).patch(`/api/products/${p.id}/stock`)).send({ change: -2 });
    expect(res.status).toBe(200);
    expect(res.body.product.stock).toBe(3);
  });

  test('stock can never go below zero', async () => {
    const p = await addProduct();
    const res = await withKey(request(app).patch(`/api/products/${p.id}/stock`)).send({ change: -6 });
    expect(res.status).toBe(409);
    expect(res.body.available).toBe(5);
  });

  test('two buyers at once cannot both take the last item', async () => {
    const p = await addProduct({ name: 'Last one', price: 10, stock: 1 });
    const [a, b] = await Promise.all([
      withKey(request(app).patch(`/api/products/${p.id}/stock`)).send({ change: -1 }),
      withKey(request(app).patch(`/api/products/${p.id}/stock`)).send({ change: -1 }),
    ]);
    expect([a.status, b.status].sort()).toEqual([200, 409]);
  });

  test('a normal user cannot change stock, even with a valid token', async () => {
    const p = await addProduct();
    const res = await asUser(request(app).patch(`/api/products/${p.id}/stock`)).send({ change: -1 });
    expect(res.status).toBe(403);
  });

  test('a wrong internal key is refused', async () => {
    const p = await addProduct();
    const res = await request(app)
      .patch(`/api/products/${p.id}/stock`)
      .set('x-internal-key', 'guess')
      .send({ change: -1 });
    expect(res.status).toBe(401);
  });
});
