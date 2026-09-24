const mongoose = require('mongoose');
const logger = require('../utils/logger');
let mongoServer;

async function connect(uri = process.env.MONGODB_URI) {
  if (!uri && process.env.NODE_ENV !== 'production') {
    const { MongoMemoryServer } = require('mongodb-memory-server');
    mongoServer = await MongoMemoryServer.create();
    uri = mongoServer.getUri();
  }
  await mongoose.connect(uri || 'mongodb://127.0.0.1:27017/fintrack');
  logger.info('MongoDB connected');
}

async function disconnect() {
  if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
  if (mongoServer) await mongoServer.stop();
}
module.exports = { connect, disconnect };
