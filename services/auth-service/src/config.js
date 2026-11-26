require('dotenv').config();

const config = {
  port: Number(process.env.PORT) || 3001,

  db: {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME || 'auth_db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
  },

  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '1h',
  },

  admin: {
    email: process.env.ADMIN_EMAIL,
    password: process.env.ADMIN_PASSWORD,
  },
};

// Fail fast instead of running with an insecure default.
if (!config.jwt.secret) {
  throw new Error('JWT_SECRET is not set. Add it to your .env file.');
}

module.exports = config;
