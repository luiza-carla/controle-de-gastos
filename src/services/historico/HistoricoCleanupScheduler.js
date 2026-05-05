const cron = require('node-cron');
const HistoricoService = require('.');
const logger = require('../../utils/logger');

const DIAS_CICLO = Number(process.env.HISTORICO_CICLO_DIAS || 30);

function descreverPoliticaLimpeza(diasCiclo) {
  return `limpeza completa a cada ${diasCiclo} dias`;
}

class HistoricoCleanupScheduler {
  constructor() {
    this.job = null;
  }

  async iniciar() {
    // Executa diariamente às 00:20
    // Verifica usuários que passaram X dias desde a última limpeza
    this.job = cron.schedule('20 0 * * *', async () => {
      await this.executarLimpeza();
    });

    const { countElegiveis, minDiasRestantes } =
      await HistoricoService.calcularDiasRestantesParaLimpeza(DIAS_CICLO);
    const politicaLimpeza = descreverPoliticaLimpeza(DIAS_CICLO);

    if (countElegiveis > 0) {
      logger.info(
        `Agendador de limpeza de historico iniciado (${politicaLimpeza}) - ${countElegiveis} usuário(s) já elegível(is)`,
        'HistoricoCleanup'
      );
    } else if (minDiasRestantes !== null) {
      logger.info(
        `Agendador de limpeza de historico iniciado (${politicaLimpeza}) - próxima limpeza em ${minDiasRestantes} dia(s)`,
        'HistoricoCleanup'
      );
    } else {
      logger.info(
        `Agendador de limpeza de historico iniciado (${politicaLimpeza}) - nenhum usuário cadastrado`,
        'HistoricoCleanup'
      );
    }

    // Executa uma vez na inicialização para facilitar testes e não depender apenas do cron.
    await this.executarLimpeza();
  }

  parar() {
    if (!this.job) return;
    this.job.stop();
    logger.info('Agendador de limpeza de historico parado', 'HistoricoCleanup');
  }

  async executarLimpeza(diasCiclo = DIAS_CICLO) {
    try {
      const politicaLimpeza = descreverPoliticaLimpeza(diasCiclo);

      logger.info(
        `Executando limpeza de historico (${politicaLimpeza})`,
        'HistoricoCleanup'
      );

      const removidos = await HistoricoService.limparPorCiclo(diasCiclo);

      if (removidos > 0) {
        logger.info(
          `Limpeza concluida: ${removidos} registro(s) removido(s)`,
          'HistoricoCleanup'
        );
      } else {
        logger.info(
          'Nenhum registro de historico necessitava ser removido neste ciclo',
          'HistoricoCleanup'
        );
      }
    } catch (error) {
      logger.error(
        'Falha na limpeza automatica do historico',
        'HistoricoCleanup',
        error
      );
    }
  }
}

module.exports = new HistoricoCleanupScheduler();
