const express = require('express');
const db = require('./db');
const products = require('./clients/productsClient');
const ordersRoutes = require('./routes/ordersRoutes');
const errorHandler = require('./middleware/errorHandler');

const app = express();
app.use(express.json());

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'orders-service' });
});

// Ready only when both the database and products-service are reachable.
app.get('/ready', async (req, res) => {
  const [dbOk, productsOk] = await Promise.all([db.isHealthy(), products.isHealthy()]);
  const ok = dbOk && productsOk;
  res.status(ok ? 200 : 503).json({ status: ok ? 'ready' : 'not ready', database: dbOk, products: productsOk });
});

app.use('/api/orders', ordersRoutes);

app.use((req, res) => res.status(404).json({ error: 'Not found' }));
app.use(errorHandler);

module.exports = app;
