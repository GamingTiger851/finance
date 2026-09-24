require('dotenv').config();
require('express-async-errors');
const app = require('./src/app');
const logger = require('./src/utils/logger');
const { validateEnv } = require('./src/config/env');
const { connect, disconnect } = require('./src/config/db');
const port = process.env.PORT || 3000;
let server;

async function start() {
  validateEnv();
  await connect();
  server = app.listen(port, () => logger.info(`API listening on ${port}`));
}
async function shutdown(signal) {
  logger.info(`${signal}: shutting down`);
  if (server) {
    await new Promise(resolve => {
      const timer = setTimeout(resolve, 10000);
      server.close(() => { clearTimeout(timer); resolve(); });
    });
  }
  await disconnect();
  if (require.main === module) process.exit(0);
}
process.once('SIGINT', () => shutdown('SIGINT'));
process.once('SIGTERM', () => shutdown('SIGTERM'));
if (require.main === module) {
  start().catch(error => { logger.error(error); process.exit(1); });
} else {
  // Serverless environment
  try {
    validateEnv();
    connect().catch(err => logger.error('Serverless DB Connect Error:', err));
  } catch (err) {
    logger.error('Serverless Env Validation Error:', err);
  }
}
module.exports = app;