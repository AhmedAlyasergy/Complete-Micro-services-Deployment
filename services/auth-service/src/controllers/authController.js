const db = require('../db');
const { hashPassword, checkPassword } = require('../utils/password');
const { createToken } = require('../utils/token');
const { validateRegister, validateLogin } = require('../utils/validate');

// Columns safe to return to clients (never password_hash).
const PUBLIC_FIELDS = 'id, name, email, role, created_at';

async function register(req, res, next) {
  try {
    const problem = validateRegister(req.body);
    if (problem) return res.status(400).json({ error: problem });

    const name = req.body.name.trim();
    const email = req.body.email.trim().toLowerCase();
    const passwordHash = await hashPassword(req.body.password);

    const result = await db.query(
      `INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3)
       RETURNING ${PUBLIC_FIELDS}`,
      [name, email, passwordHash]
    );
    return res.status(201).json({ user: result.rows[0] });
  } catch (err) {
    // 23505 = unique_violation (email already exists)
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Email is already registered' });
    }
    return next(err);
  }
}

async function login(req, res, next) {
  try {
    const problem = validateLogin(req.body);
    if (problem) return res.status(400).json({ error: problem });

    const email = String(req.body.email).trim().toLowerCase();
    const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];

    // Same response for unknown email and wrong password to prevent user enumeration.
    const ok = user && (await checkPassword(String(req.body.password), user.password_hash));
    if (!ok) return res.status(401).json({ error: 'Wrong email or password' });

    return res.status(200).json({
      token: createToken(user),
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    return next(err);
  }
}

async function me(req, res, next) {
  try {
    const result = await db.query(`SELECT ${PUBLIC_FIELDS} FROM users WHERE id = $1`, [req.user.sub]);
    if (!result.rows[0]) return res.status(404).json({ error: 'User not found' });
    return res.status(200).json({ user: result.rows[0] });
  } catch (err) {
    return next(err);
  }
}

async function listUsers(req, res, next) {
  try {
    const result = await db.query(`SELECT ${PUBLIC_FIELDS} FROM users ORDER BY id`);
    return res.status(200).json({ users: result.rows });
  } catch (err) {
    return next(err);
  }
}

async function changeRole(req, res, next) {
  try {
    const { role } = req.body || {};
    if (!['user', 'admin'].includes(role)) {
      return res.status(400).json({ error: "role must be 'user' or 'admin'" });
    }
    const result = await db.query(
      `UPDATE users SET role = $1 WHERE id = $2 RETURNING ${PUBLIC_FIELDS}`,
      [role, Number(req.params.id)]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'User not found' });
    return res.status(200).json({ user: result.rows[0] });
  } catch (err) {
    return next(err);
  }
}

// Seeds the initial admin from env vars; no-op if the email already exists.
async function ensureAdmin({ email, password }) {
  if (!email || !password) return;
  const passwordHash = await hashPassword(password);
  await db.query(
    `INSERT INTO users (name, email, password_hash, role) VALUES ('Admin', $1, $2, 'admin')
     ON CONFLICT (email) DO NOTHING`,
    [email.toLowerCase(), passwordHash]
  );
}

module.exports = { register, login, me, listUsers, changeRole, ensureAdmin };
