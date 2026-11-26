require('dotenv').config();

const config = {
  port: Number(process.env.PORT) || 3002,

  db: {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME || 'products_db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
  },

  jwtSecret: process.env.JWT_SECRET,

  internalApiKey: process.env.INTERNAL_API_KEY,
};

if (!config.jwtSecret) {
  throw new Error('JWT_SECRET is not set. Add it to your .env file (same value as auth-service).');
}

module.exports = config;
