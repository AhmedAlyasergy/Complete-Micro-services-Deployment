const app = require('./app');
const config = require('./config');
const db = require('./db');
const { ensureAdmin } = require('./controllers/authController');

async function start() {
  await db.migrate();
  await ensureAdmin(config.admin);

  const server = app.listen(config.port, () => {
    console.log(JSON.stringify({ level: 'info', message: `auth-service running on port ${config.port}` }));
  });

  const shutdown = () => {
    server.close(async () => {
      await db.close();
      process.exit(0);
    });
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

start().catch((err) => {
  console.error(JSON.stringify({ level: 'error', message: `failed to start: ${err.message}` }));
  process.exit(1);
});
