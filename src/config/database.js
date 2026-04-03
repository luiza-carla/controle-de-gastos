const mongoose = require('mongoose');
const logger = require('../utils/logger');

mongoose.set('sanitizeFilter', true);
mongoose.set('strictQuery', true);

async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGO_URL);
    logger.info('Banco conectado', 'database');
  } catch (error) {
    logger.error('Erro ao conectar no MongoDB', 'database', error);
    process.exit(1);
  }
}

module.exports = connectDB;
