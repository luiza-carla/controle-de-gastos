const ResumoService = require('../services/resumo/index');
const { criarErro } = require('../utils/errorHelpers');
const { parseQueryDate } = require('../utils/queryHelpers');

class ResumoController {
  obterPeriodo(req) {
    const { dataInicio: dataInicioRaw, dataFim: dataFimRaw } = req.query;
    const dataInicio = parseQueryDate(dataInicioRaw);
    const dataFim = parseQueryDate(dataFimRaw, { endOfDay: true });
    const possuiDataInicio = typeof dataInicioRaw === 'string' && dataInicioRaw;
    const possuiDataFim = typeof dataFimRaw === 'string' && dataFimRaw;

    if (
      (possuiDataInicio && !dataFimRaw) ||
      (possuiDataFim && !dataInicioRaw)
    ) {
      throw criarErro(
        400,
        'Informe as duas datas para filtrar o resumo por período.'
      );
    }

    if (possuiDataInicio && !dataInicio) {
      throw criarErro(400, 'Data de início inválida.');
    }

    if (possuiDataFim && !dataFim) {
      throw criarErro(400, 'Data de fim inválida.');
    }

    if (dataInicio && dataFim && dataInicio > dataFim) {
      throw criarErro(
        400,
        'A data de início não pode ser maior que a data de fim.'
      );
    }

    if (!dataInicio || !dataFim) {
      return null;
    }

    return {
      dataInicio,
      dataFim,
    };
  }

  // Obtém resumo financeiro do usuário
  async obterResumo(req, res) {
    // Recupera ID do usuário autenticado
    const usuarioId = req.user.id; // string é suficiente para os métodos de serviço
    const periodo = this.obterPeriodo(req);

    // Gera resumo financeiro com dados do mês
    const dados = await ResumoService.gerarResumo(usuarioId, periodo);
    res.json(dados);
  }

  // Obtém projeção financeira futura do usuário
  async obterProjecao(req, res) {
    // Recupera ID do usuário autenticado
    const usuarioId = req.user.id;
    const periodo = this.obterPeriodo(req);

    // Gera projeção financeira considerando transações pendentes
    const dados = await ResumoService.gerarProjecao(usuarioId, periodo);
    res.json(dados);
  }
}

module.exports = new ResumoController();
