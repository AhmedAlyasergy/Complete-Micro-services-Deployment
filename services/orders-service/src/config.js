require('dotenv').config();

const config = {
  port: Number(process.env.PORT) || 3003,

  db: {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME || 'orders_db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
  },

  jwtSecret: process.env.JWT_SECRET,

  productsUrl: (process.env.PRODUCTS_URL || 'http://localhost:3002').replace(/\/$/, ''),

  internalApiKey: process.env.INTERNAL_API_KEY,

  productsTimeoutMs: Number(process.env.PRODUCTS_TIMEOUT_MS) || 3000,
};

if (!config.jwtSecret) {
  throw new Error('JWT_SECRET is not set. Add it to your .env file (same value as auth-service).');
}
if (!config.internalApiKey) {
  throw new Error('INTERNAL_API_KEY is not set. Add it to your .env file (same value as products-service).');
}

module.exports = config;
