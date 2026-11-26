const request = require('supertest');
const jwt = require('jsonwebtoken');

const mockShelf = new Map();
let mockProductsDown = false;

jest.mock('../../src/clients/productsClient', () => {
  const { ProductsError } = jest.requireActual('../../src/clients/productsClient');
  return {
    ProductsError,
    isHealthy: async () => !mockProductsDown,
    getProduct: async (id) => {
      if (mockProductsDown) throw new ProductsError('Products service is unavailable, please try again', 503);
      const p = mockShelf.get(id);
      if (!p) throw new ProductsError(`Product ${id} not found`, 400, { productId: id });
      return { ...p };
    },
    changeStock: async (id, change) => {
      const p = mockShelf.get(id);
      if (!p) throw new ProductsError(`Product ${id} not found`, 400, { productId: id });
      if (p.stock + change < 0) {
        throw new ProductsError(`Not enough stock for product ${id}`, 409, { productId: id, available: p.stock });
      }
      p.stock += change;
      return { ...p };
    },
  };
});

const app = require('../../src/app');
const db = require('../../src/db');

const token = (sub, role = 'user') => jwt.sign({ sub, email: `u${sub}@test.com`, role }, process.env.JWT_SECRET);
const sara = token(2);
const omar = token(3);
const admin = token(1, 'admin');
const as = (req, t) => req.set('Authorization', `Bearer ${t}`);

async function placeOrder(t, items) {
  return as(request(app).post('/api/orders'), t).send({ items });
}

beforeAll(async () => {
  await db.migrate();
});

beforeEach(async () => {
  await db.query('TRUNCATE orders, order_items RESTART IDENTITY');
  mockProductsDown = false;
  mockShelf.clear();
  mockShelf.set(1, { id: 1, name: 'Laptop', price: 1200, stock: 5 });
  mockShelf.set(2, { id: 2, name: 'Mouse', price: 15.5, stock: 10 });
});

afterAll(async () => {
  await db.close();
});

describe('health', () => {
  test('/health answers, /ready checks database and Products', async () => {
    expect((await request(app).get('/health')).status).toBe(200);
    expect((await request(app).get('/ready')).body).toMatchObject({ database: true, products: true });
    mockProductsDown = true;
    expect((await request(app).get('/ready')).status).toBe(503);
  });
});

describe('placing an order', () => {
  test('saves the order with real prices, total and items, and takes the stock', async () => {
    const res = await placeOrder(sara, [{ productId: 1, quantity: 2 }, { productId: 2, quantity: 3 }]);
    expect(res.status).toBe(201);
    expect(res.body.order).toMatchObject({ user_id: 2, total: 2446.5, status: 'pending' });
    expect(res.body.order.items).toHaveLength(2);
    expect(res.body.order.items[0]).toMatchObject({ product_name: 'Laptop', unit_price: 1200, quantity: 2 });
    expect(mockShelf.get(1).stock).toBe(3);
    expect(mockShelf.get(2).stock).toBe(7);
  });

  test('ignores any price the user tries to send', async () => {
    const res = await placeOrder(sara, [{ productId: 1, quantity: 1, price: 1 }]);
    expect(res.body.order.total).toBe(1200);
  });

  test('needs a login', async () => {
    const res = await request(app).post('/api/orders').send({ items: [{ productId: 1, quantity: 1 }] });
    expect(res.status).toBe(401);
  });

  test('bad shopping list is rejected', async () => {
    expect((await placeOrder(sara, [])).status).toBe(400);
  });

  test('unknown product is rejected', async () => {
    const res = await placeOrder(sara, [{ productId: 99, quantity: 1 }]);
    expect(res.status).toBe(400);
    expect(res.body.productId).toBe(99);
  });

  test('not enough stock is rejected, and nothing is saved', async () => {
    const res = await placeOrder(sara, [{ productId: 1, quantity: 6 }]);
    expect(res.status).toBe(409);
    expect(res.body.available).toBe(5);
    const count = await db.query('SELECT COUNT(*)::int AS n FROM orders');
    expect(count.rows[0].n).toBe(0);
  });

  test('if the 2nd product fails, the stock taken for the 1st is given back', async () => {
    const res = await placeOrder(sara, [{ productId: 2, quantity: 4 }, { productId: 1, quantity: 50 }]);
    expect(res.status).toBe(409);
    expect(mockShelf.get(2).stock).toBe(10);
    expect(mockShelf.get(1).stock).toBe(5);
  });

  test('if Products is down, the customer gets a clear "try again" answer', async () => {
    mockProductsDown = true;
    const res = await placeOrder(sara, [{ productId: 1, quantity: 1 }]);
    expect(res.status).toBe(503);
  });
});

describe('seeing orders', () => {
  test('customers only see their own orders', async () => {
    await placeOrder(sara, [{ productId: 1, quantity: 1 }]);
    await placeOrder(omar, [{ productId: 2, quantity: 1 }]);
    const res = await as(request(app).get('/api/orders'), sara);
    expect(res.body.orders).toHaveLength(1);
    expect(res.body.orders[0].user_id).toBe(2);
  });

  test("a customer cannot open someone else's order", async () => {
    const o = (await placeOrder(omar, [{ productId: 2, quantity: 1 }])).body.order;
    expect((await as(request(app).get(`/api/orders/${o.id}`), sara)).status).toBe(404);
    expect((await as(request(app).get(`/api/orders/${o.id}`), omar)).status).toBe(200);
  });

  test("admins see everyone's orders", async () => {
    await placeOrder(sara, [{ productId: 1, quantity: 1 }]);
    await placeOrder(omar, [{ productId: 2, quantity: 1 }]);
    const res = await as(request(app).get('/api/orders'), admin);
    expect(res.body.orders).toHaveLength(2);
  });
});

describe('cancelling and status', () => {
  test('a customer can cancel their order and the stock comes back', async () => {
    const o = (await placeOrder(sara, [{ productId: 1, quantity: 2 }])).body.order;
    expect(mockShelf.get(1).stock).toBe(3);
    const res = await as(request(app).patch(`/api/orders/${o.id}/cancel`), sara);
    expect(res.status).toBe(200);
    expect(res.body.order.status).toBe('cancelled');
    expect(mockShelf.get(1).stock).toBe(5);
  });

  test('cancelling twice is refused (stock is not given back twice)', async () => {
    const o = (await placeOrder(sara, [{ productId: 1, quantity: 2 }])).body.order;
    await as(request(app).patch(`/api/orders/${o.id}/cancel`), sara);
    const again = await as(request(app).patch(`/api/orders/${o.id}/cancel`), sara);
    expect(again.status).toBe(409);
    expect(mockShelf.get(1).stock).toBe(5);
  });

  test("a customer cannot cancel someone else's order", async () => {
    const o = (await placeOrder(omar, [{ productId: 1, quantity: 1 }])).body.order;
    expect((await as(request(app).patch(`/api/orders/${o.id}/cancel`), sara)).status).toBe(404);
  });

  test('admin moves an order: pending → paid → shipped', async () => {
    const o = (await placeOrder(sara, [{ productId: 1, quantity: 1 }])).body.order;
    const paid = await as(request(app).patch(`/api/orders/${o.id}/status`), admin).send({ status: 'paid' });
    expect(paid.body.order.status).toBe('paid');
    const shipped = await as(request(app).patch(`/api/orders/${o.id}/status`), admin).send({ status: 'shipped' });
    expect(shipped.body.order.status).toBe('shipped');
  });

  test('a shipped order cannot be cancelled', async () => {
    const o = (await placeOrder(sara, [{ productId: 1, quantity: 1 }])).body.order;
    await as(request(app).patch(`/api/orders/${o.id}/status`), admin).send({ status: 'paid' });
    await as(request(app).patch(`/api/orders/${o.id}/status`), admin).send({ status: 'shipped' });
    expect((await as(request(app).patch(`/api/orders/${o.id}/cancel`), sara)).status).toBe(409);
  });

  test('a normal user cannot change status', async () => {
    const o = (await placeOrder(sara, [{ productId: 1, quantity: 1 }])).body.order;
    const res = await as(request(app).patch(`/api/orders/${o.id}/status`), sara).send({ status: 'paid' });
    expect(res.status).toBe(403);
  });
});
