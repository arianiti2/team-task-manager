const mongoose = require('mongoose');
const logger = require('../utils/logger');
const { MONGODB_URI } = require('./env');

const connectDB = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    logger.info('MongoDB Connected Successfully');
  } catch (error) {
    logger.error('MongoDB Connection Error:', error);
    process.exit(1);
  }
};

module.exports = connectDB;