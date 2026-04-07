const cron = require('node-cron');
const FaturaService = require('./FaturaService');
const logger = require('../utils/logger');

class FaturaScheduler {
  constructor() {
    this.job = null;
  }

  iniciar() {
    this.job = cron.schedule('3 0 * * *', async () => {
      logger.info('Verificando fechamento de faturas', 'FaturaScheduler');
      await this.processarFaturasDoDia();
    });

    logger.info('Agendador de faturas iniciado', 'FaturaScheduler');
    this.processarFaturasDoDia();
  }

  parar() {
    if (this.job) {
      this.job.stop();
      logger.info('Agendador de faturas parado', 'FaturaScheduler');
    }
  }

  async processarFaturasDoDia() {
    try {
      const fechadas = await FaturaService.fecharFaturasDoDia();
      const atrasadas = await FaturaService.atualizarFaturasAtrasadas();

      logger.info(
        `Processamento de faturas concluído: ${fechadas} fechamento(s), ${atrasadas} atraso(s)`,
        'FaturaScheduler'
      );
    } catch (error) {
      logger.error(
        'Erro ao processar faturas do dia',
        'FaturaScheduler',
        error
      );
    }
  }
}

module.exports = new FaturaScheduler();
