const express = require('express');
const db = require('./db');
const productsRoutes = require('./routes/productsRoutes');
const errorHandler = require('./middleware/errorHandler');

const app = express();
app.use(express.json());

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'products-service' });
});

app.get('/ready', async (req, res) => {
  const dbOk = await db.isHealthy();
  res.status(dbOk ? 200 : 503).json({ status: dbOk ? 'ready' : 'not ready', database: dbOk });
});

app.use('/api/products', productsRoutes);

app.use((req, res) => res.status(404).json({ error: 'Not found' }));
app.use(errorHandler);

module.exports = app;
