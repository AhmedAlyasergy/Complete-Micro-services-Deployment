const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const config = require('./config');

const pool = new Pool({ ...config.db, max: 10 });

function query(text, params) {
  return pool.query(text, params);
}

// Applies migrations/*.sql in order. Scripts use IF NOT EXISTS, so this is idempotent.
async function migrate() {
  const dir = path.join(__dirname, '..', 'migrations');
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();
  for (const file of files) {
    await pool.query(fs.readFileSync(path.join(dir, file), 'utf8'));
  }
}

async function isHealthy() {
  try {
    await pool.query('SELECT 1');
    return true;
  } catch {
    return false;
  }
}

function close() {
  return pool.end();
}

module.exports = { query, migrate, isHealthy, close };
