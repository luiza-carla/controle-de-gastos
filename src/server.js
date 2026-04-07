require('dotenv').config();
const app = require('./app');
const connectDB = require('./config/database');
const garantirCategoriasPadrao = require('./utils/seedCategoria');
const salarioScheduler = require('./services/SalarioScheduler');
const faturaScheduler = require('./services/FaturaScheduler');
const historicoCleanupScheduler = require('./services/HistoricoCleanupScheduler');
const logger = require('./utils/logger');

async function iniciarServidor() {
  await connectDB();
  // Garante categorias padrão no banco
  await garantirCategoriasPadrao();

  // Inicia agendador de salários recorrentes
  salarioScheduler.iniciar();

  // Inicia agendador de fechamento e atraso das faturas de cartão
  faturaScheduler.iniciar();

  // Inicia limpeza automática do histórico
  historicoCleanupScheduler.iniciar();

  app.listen(process.env.PORT, () => {
    logger.info('Servidor rodando', 'server');
  });
}

iniciarServidor().catch((error) => {
  logger.error('Falha ao iniciar servidor', 'server', error);
  process.exit(1);
});
