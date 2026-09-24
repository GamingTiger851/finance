const Redis = require('ioredis');
const logger = require('../utils/logger');
let client;
function getRedis() {
  if (!process.env.REDIS_URL) return null;
  if (!client) {
    client = new Redis(process.env.REDIS_URL, { lazyConnect: true, maxRetriesPerRequest: 1 });
    client.on('error', error => logger.warn(`Redis connection error: ${error.message}`));
  }
  return client;
}
module.exports = { getRedis };
