const cron = require('node-cron');
const mongoose = require('mongoose');
const Transacao = require('../models/Transacao');
const categoriaHelpers = require('../utils/categoriaHelpers');
const { formatarMoeda } = require('../utils/stringHelpers');
const SaldoService = require('./saldo');
const logger = require('../utils/logger');
const { startOfMonth } = require('date-fns');

async function buscarSalariosParaProcessar(diaAtual, refs) {
  const filtroBase = {
    ativa: true,
    frequencia: 'mensal',
    diaRecebimento: mongoose.trusted({ $lte: diaAtual }),
    $or: [
      { fonteSaldo: 'carteira' },
      { conta: mongoose.trusted({ $exists: true, $ne: null }) },
    ],
  };

  const { filtroCategoria } = categoriaHelpers.obterFiltrosSalario(refs);
  const filtro = mongoose.trusted({ $and: [filtroBase, filtroCategoria] });

  return Transacao.find(filtro)
    .setOptions({ sanitizeFilter: false })
    .populate('usuario')
    .populate('conta');
}

async function processarSalario(salario, hoje, inicioMes) {
  const jaProcessado =
    salario.dataUltimoProcessamento &&
    new Date(salario.dataUltimoProcessamento) >= inicioMes;

  if (jaProcessado) {
    logger.info(
      `Salario ${salario._id} já processado neste mes`,
      'SalarioScheduler'
    );
    return false;
  }

  await SaldoService.aplicarMovimento(salario, salario.usuario._id);
  salario.dataUltimoProcessamento = hoje;
  salario.status = 'pago';
  await salario.save();

  logger.info(
    `Salario processado: ${formatarMoeda(salario.valor)} para usuario ${salario.usuario._id}`,
    'SalarioScheduler'
  );
  return true;
}

// Serviço responsável por agendar e processar salários automaticamente
class SalarioScheduler {
  constructor() {
    this.job = null;
  }

  // Inicia o agendador para verificar salários diariamente
  iniciar() {
    // Executa agenda de processamento diário
    this.job = cron.schedule('1 0 * * *', async () => {
      logger.info('Verificando salarios para processar', 'SalarioScheduler');
      await this.processarSalariosDodia();
    });

    logger.info('Agendador de salarios iniciado', 'SalarioScheduler');

    // Executa imediatamente ao iniciar (útil para testes/desenvolvimento)
    this.processarSalariosDodia();
  }

  // Para o agendador em execução
  parar() {
    if (this.job) {
      this.job.stop();
      logger.info('Agendador de salarios parado', 'SalarioScheduler');
    }
  }

  async processarSalariosDodia() {
    try {
      const hoje = new Date();
      const refs = await categoriaHelpers.buscarSalario();

      if (!refs?.categoria) {
        logger.warn('Categoria Salario não encontrada', 'SalarioScheduler');
        return;
      }

      const salarios = await buscarSalariosParaProcessar(hoje.getDate(), refs);

      if (!salarios.length) {
        logger.info(
          `Nenhum salário para processar no dia ${hoje.getDate()}`,
          'SalarioScheduler'
        );
        return;
      }

      logger.info(
        `Processando ${salarios.length} salário(s)`,
        'SalarioScheduler'
      );

      let processados = 0;
      let erros = 0;

      for (const salario of salarios) {
        try {
          const sucesso = await processarSalario(
            salario,
            hoje,
            startOfMonth(hoje)
          );
          if (sucesso) processados++;
        } catch (erro) {
          erros++;
          logger.error(
            `Erro ao processar salário ${salario._id}`,
            'SalarioScheduler',
            erro.message
          );
        }
      }

      logger.info(
        `Processamento concluído: ${processados} sucesso, ${erros} erros`,
        'SalarioScheduler'
      );
    } catch (erro) {
      logger.error(
        'Erro ao processar salários do dia',
        'SalarioScheduler',
        erro
      );
    }
  }
  // Força o processamento manual de salários
  async processarManualmente() {
    logger.info('Processamento manual iniciado', 'SalarioScheduler');
    await this.processarSalariosDodia();
  }
}

module.exports = new SalarioScheduler();
