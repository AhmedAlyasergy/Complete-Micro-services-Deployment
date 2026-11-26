const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const config = require('./config');

const pool = new Pool({ ...config.db, max: 10 });

function query(text, params) {
  return pool.query(text, params);
}

// Runs `work` inside BEGIN/COMMIT; rolls back on any error.
async function transaction(work) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
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

module.exports = { query, transaction, migrate, isHealthy, close };
