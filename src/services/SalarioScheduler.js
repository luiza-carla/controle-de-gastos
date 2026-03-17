const cron = require('node-cron');
const Transacao = require('../models/Transacao');
const categoriaHelpers = require('../utils/categoriaHelpers');
const { formatarMoeda } = require('../utils/stringHelpers');
const SaldoService = require('./SaldoService');
const logger = require('../utils/logger');

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

  // Processa salários que devem ser creditados no dia
  async processarSalariosDodia() {
    try {
      const hoje = new Date();
      const diaAtual = hoje.getDate();
      const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);

      // Busca a categoria "Salário"
      const refs = await categoriaHelpers.buscarSalario();

      if (!refs || !refs.categoria) {
        logger.warn('Categoria Salario nao encontrada', 'SalarioScheduler');
        return;
      }

      // Busca transações de salário recorrentes que devem ser processadas hoje
      // base do filtro. inclui tanto salários em conta quanto em carteira.
      // Nota: salários com diaRecebimento anterior ao dia atual (atrasados)
      // também devem ser processados, desde que não tenham sido rodados no mês.
      const filtroBase = {
        ativa: true,
        frequencia: 'mensal',
        diaRecebimento: { $lte: diaAtual },
        $or: [
          { fonteSaldo: 'carteira' },
          { conta: { $exists: true, $ne: null } },
        ],
      };

      const { filtroCategoria } = categoriaHelpers.obterFiltrosSalario(refs);
      const filtro = {
        $and: [filtroBase, filtroCategoria],
      };

      const salarios = await Transacao.find(filtro)
        .populate('usuario')
        .populate('conta');

      if (salarios.length === 0) {
        logger.info(
          `Nenhum salario para processar no dia ${diaAtual}`,
          'SalarioScheduler'
        );
        return;
      }

      logger.info(
        `Processando ${salarios.length} salario(s)`,
        'SalarioScheduler'
      );

      let processados = 0;
      let erros = 0;

      for (const salario of salarios) {
        try {
          // Verifica se já foi processado este mês
          const ultimoProcessamento = salario.dataUltimoProcessamento;
          const jaProcessadoEsteMes =
            ultimoProcessamento && new Date(ultimoProcessamento) >= inicioMes;

          if (jaProcessadoEsteMes) {
            logger.info(
              `Salario ${salario._id} ja processado neste mes`,
              'SalarioScheduler'
            );
            continue;
          }

          // usar SaldoService para manter o mesmo comportamento que outros
          await SaldoService.aplicarMovimento(salario, salario.usuario._id);

          // Atualiza a data de último processamento
          salario.dataUltimoProcessamento = hoje;
          salario.status = 'pago';
          await salario.save();

          processados++;
          logger.info(
            `Salario processado: ${formatarMoeda(salario.valor)} para usuario ${salario.usuario._id}`,
            'SalarioScheduler'
          );
        } catch (erro) {
          erros++;
          logger.error(
            `Erro ao processar salario ${salario._id}`,
            'SalarioScheduler',
            erro.message
          );
        }
      }

      logger.info(
        `Processamento concluido: ${processados} sucesso, ${erros} erros`,
        'SalarioScheduler'
      );
    } catch (erro) {
      logger.error(
        'Erro ao processar salarios do dia',
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
