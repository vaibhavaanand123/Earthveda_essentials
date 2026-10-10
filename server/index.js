import { createApp } from './app.js';
import { loadConfig } from './config.js';
import { openDatabase } from './db/database.js';
import { createLogger } from './lib/logger.js';

process.umask(0o077);
let config;
try {
  config = loadConfig();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}

const logger = createLogger({ level: config.logLevel, base: { service: 'earthveda-api' } });
const db = openDatabase(config.databasePath);
const { app, worker, service, ready } = createApp({ config, db, logger });
await ready;
worker.start();
const reconciliationTimer = setInterval(
  () =>
    service
      .reconcile()
      .then((r) => {
        if (r?.failures?.length)
          logger.error('Payment reconciliation needs attention', {
            orders: r.failures.map((x) => x.orderNumber),
          });
      })
      .catch((err) => logger.error('Payment reconciliation failed', { err })),
  60000,
);
reconciliationTimer.unref();

const server = app.listen(config.port, config.host, () => {
  logger.info('server listening', { port: config.port, env: config.env, db: config.databasePath });
});
server.keepAliveTimeout = 65_000; // longer than typical load-balancer idle timeouts
server.headersTimeout = 66_000;

let shuttingDown = false;
function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info('shutting down', { signal });
  worker.stop();
  clearInterval(reconciliationTimer);
  server.close(() => {
    db.close();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref();
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('unhandledRejection', (reason) => logger.error('unhandled rejection', { err: reason }));
