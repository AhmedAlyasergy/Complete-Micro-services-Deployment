const db = require('../db');
const { validateProduct, parsePaging } = require('../utils/validate');

const FIELDS = 'id, name, description, price::float AS price, stock, created_at, updated_at';

function parseId(req, res) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) {
    res.status(400).json({ error: 'id must be a positive whole number' });
    return null;
  }
  return id;
}

async function list(req, res, next) {
  try {
    const { page, limit, offset } = parsePaging(req.query);
    const [items, count] = await Promise.all([
      db.query(`SELECT ${FIELDS} FROM products ORDER BY created_at DESC, id DESC LIMIT $1 OFFSET $2`, [limit, offset]),
      db.query('SELECT COUNT(*)::int AS total FROM products'),
    ]);
    return res.status(200).json({ products: items.rows, page, limit, total: count.rows[0].total });
  } catch (err) {
    return next(err);
  }
}

async function getOne(req, res, next) {
  try {
    const id = parseId(req, res);
    if (id === null) return undefined;
    const result = await db.query(`SELECT ${FIELDS} FROM products WHERE id = $1`, [id]);
    if (!result.rows[0]) return res.status(404).json({ error: 'Product not found' });
    return res.status(200).json({ product: result.rows[0] });
  } catch (err) {
    return next(err);
  }
}

async function create(req, res, next) {
  try {
    const problem = validateProduct(req.body);
    if (problem) return res.status(400).json({ error: problem });
    const { name, description = '', price, stock = 0 } = req.body;
    const result = await db.query(
      `INSERT INTO products (name, description, price, stock) VALUES ($1, $2, $3, $4) RETURNING ${FIELDS}`,
      [name.trim(), description, price, stock]
    );
    return res.status(201).json({ product: result.rows[0] });
  } catch (err) {
    return next(err);
  }
}

async function update(req, res, next) {
  try {
    const id = parseId(req, res);
    if (id === null) return undefined;
    const problem = validateProduct(req.body, { partial: true });
    if (problem) return res.status(400).json({ error: problem });

    const { name, description, price, stock } = req.body;
    const result = await db.query(
      `UPDATE products SET
         name        = COALESCE($1, name),
         description = COALESCE($2, description),
         price       = COALESCE($3, price),
         stock       = COALESCE($4, stock),
         updated_at  = NOW()
       WHERE id = $5 RETURNING ${FIELDS}`,
      [name === undefined ? null : name.trim(), description ?? null, price ?? null, stock ?? null, id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Product not found' });
    return res.status(200).json({ product: result.rows[0] });
  } catch (err) {
    return next(err);
  }
}

async function remove(req, res, next) {
  try {
    const id = parseId(req, res);
    if (id === null) return undefined;
    const result = await db.query('DELETE FROM products WHERE id = $1 RETURNING id', [id]);
    if (!result.rows[0]) return res.status(404).json({ error: 'Product not found' });
    return res.status(204).send();
  } catch (err) {
    return next(err);
  }
}

// Check and update happen in a single statement, so concurrent orders can't oversell.
async function changeStock(req, res, next) {
  try {
    const id = parseId(req, res);
    if (id === null) return undefined;
    const change = req.body && req.body.change;
    if (!Number.isInteger(change) || change === 0) {
      return res.status(400).json({ error: 'change must be a whole number, not 0 (e.g. -2 or 5)' });
    }

    const result = await db.query(
      `UPDATE products SET stock = stock + $1, updated_at = NOW()
       WHERE id = $2 AND stock + $1 >= 0 RETURNING ${FIELDS}`,
      [change, id]
    );
    if (result.rows[0]) return res.status(200).json({ product: result.rows[0] });

    const exists = await db.query('SELECT stock FROM products WHERE id = $1', [id]);
    if (!exists.rows[0]) return res.status(404).json({ error: 'Product not found' });
    return res.status(409).json({ error: 'Not enough stock', available: exists.rows[0].stock });
  } catch (err) {
    return next(err);
  }
}

module.exports = { list, getOne, create, update, remove, changeStock };
