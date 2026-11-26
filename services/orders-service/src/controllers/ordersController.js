const db = require('../db');
const products = require('../clients/productsClient');
const { validateItems, mergeItems, calculateTotal, canChangeStatus, STATUSES } = require('../utils/orderMath');

function parseId(req, res) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) {
    res.status(400).json({ error: 'id must be a positive whole number' });
    return null;
  }
  return id;
}

async function loadOrder(id) {
  const orderRes = await db.query(
    'SELECT id, user_id, total::float AS total, status, created_at, updated_at FROM orders WHERE id = $1',
    [id]
  );
  const order = orderRes.rows[0];
  if (!order) return null;
  const itemsRes = await db.query(
    `SELECT product_id, product_name, unit_price::float AS unit_price, quantity
     FROM order_items WHERE order_id = $1 ORDER BY id`,
    [id]
  );
  return { ...order, items: itemsRes.rows };
}

// Best-effort compensation: failures are logged rather than failing the request.
async function returnStock(lines) {
  await Promise.all(
    lines.map((l) =>
      products.changeStock(l.productId, l.quantity).catch((err) => {
        console.error(JSON.stringify({ level: 'error', message: 'failed to return stock', productId: l.productId, error: err.message }));
      })
    )
  );
}

function isOwnerOrAdmin(req, order) {
  return req.user.role === 'admin' || order.user_id === Number(req.user.sub);
}

// Flow: validate -> fetch real prices from products-service -> reserve stock
// -> save order + items in one transaction. On failure, reserved stock is returned.
async function create(req, res, next) {
  const problem = validateItems(req.body && req.body.items);
  if (problem) return res.status(400).json({ error: problem });

  const wanted = mergeItems(req.body.items);
  const reserved = [];

  try {
    const lines = [];
    for (const item of wanted) {
      const p = await products.getProduct(item.productId);
      lines.push({ productId: p.id, name: p.name, unitPrice: p.price, quantity: item.quantity });
    }

    for (const line of lines) {
      await products.changeStock(line.productId, -line.quantity);
      reserved.push(line);
    }

    const total = calculateTotal(lines);
    const orderId = await db.transaction(async (client) => {
      const o = await client.query('INSERT INTO orders (user_id, total) VALUES ($1, $2) RETURNING id', [
        Number(req.user.sub),
        total,
      ]);
      for (const l of lines) {
        await client.query(
          `INSERT INTO order_items (order_id, product_id, product_name, unit_price, quantity)
           VALUES ($1, $2, $3, $4, $5)`,
          [o.rows[0].id, l.productId, l.name, l.unitPrice, l.quantity]
        );
      }
      return o.rows[0].id;
    });

    return res.status(201).json({ order: await loadOrder(orderId) });
  } catch (err) {
    if (reserved.length) await returnStock(reserved);
    if (err instanceof products.ProductsError) {
      return res.status(err.status).json({ error: err.message, ...err.details });
    }
    return next(err);
  }
}

async function list(req, res, next) {
  try {
    const isAdmin = req.user.role === 'admin';
    const result = await db.query(
      `SELECT id, user_id, total::float AS total, status, created_at, updated_at FROM orders
       ${isAdmin ? '' : 'WHERE user_id = $1'} ORDER BY created_at DESC, id DESC LIMIT 100`,
      isAdmin ? [] : [Number(req.user.sub)]
    );
    return res.status(200).json({ orders: result.rows });
  } catch (err) {
    return next(err);
  }
}

async function getOne(req, res, next) {
  try {
    const id = parseId(req, res);
    if (id === null) return undefined;
    const order = await loadOrder(id);
    // 404 rather than 403 so other users' order ids aren't revealed.
    if (!order || !isOwnerOrAdmin(req, order)) return res.status(404).json({ error: 'Order not found' });
    return res.status(200).json({ order });
  } catch (err) {
    return next(err);
  }
}

async function moveTo(req, res, next, newStatus, { ownerAllowed }) {
  try {
    const id = parseId(req, res);
    if (id === null) return undefined;
    const order = await loadOrder(id);
    const allowed = order && (ownerAllowed ? isOwnerOrAdmin(req, order) : true);
    if (!allowed) return res.status(404).json({ error: 'Order not found' });

    if (!canChangeStatus(order.status, newStatus)) {
      return res.status(409).json({ error: `Cannot change order from '${order.status}' to '${newStatus}'` });
    }

    // Conditional update (optimistic locking) prevents double cancellations / stock returns.
    const updated = await db.query(
      'UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2 AND status = $3 RETURNING id',
      [newStatus, id, order.status]
    );
    if (!updated.rows[0]) return res.status(409).json({ error: 'Order was changed by someone else, try again' });

    if (newStatus === 'cancelled') {
      await returnStock(order.items.map((i) => ({ productId: i.product_id, quantity: i.quantity })));
    }
    return res.status(200).json({ order: await loadOrder(id) });
  } catch (err) {
    return next(err);
  }
}

function cancel(req, res, next) {
  return moveTo(req, res, next, 'cancelled', { ownerAllowed: true });
}

function changeStatus(req, res, next) {
  const status = req.body && req.body.status;
  if (!STATUSES.includes(status) || status === 'pending') {
    return res.status(400).json({ error: "status must be 'paid', 'shipped' or 'cancelled'" });
  }
  return moveTo(req, res, next, status, { ownerAllowed: false });
}

module.exports = { create, list, getOne, cancel, changeStatus };
