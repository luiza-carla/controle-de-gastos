const HistoricoService = require('../services/historico');
const { parseQueryInt } = require('../utils/queryHelpers');

class HistoricoController {
  // Lista histórico do usuário logado
  async listar(req, res) {
    const filtros = {
      entidade: req.query.entidade,
      acao: req.query.acao,
      desfeito: req.query.desfeito,
      ordenarPor: req.query.ordenarPor || req.query.sortBy,
      limit: parseQueryInt(req.query.limit, 50, { min: 1, max: 100 }),
      skip: parseQueryInt(req.query.skip, 0, { min: 0, max: 10000 }),
    };

    const resultado = await HistoricoService.buscarPorUsuario(
      req.user.id,
      filtros
    );

    res.json({
      success: true,
      data: resultado.historicos,
      pagination: {
        total: resultado.total,
        limit: resultado.limit,
        skip: resultado.skip,
        hasMore: resultado.skip + resultado.limit < resultado.total,
      },
    });
  }

  // Busca histórico de uma entidade específica
  async buscarPorEntidade(req, res) {
    const { entidade, entidadeId } = req.params;
    const historicos = await HistoricoService.buscarPorEntidade(
      entidade,
      entidadeId,
      req.user.id
    );

    res.json({
      success: true,
      data: historicos,
    });
  }

  // Desfaz uma ação do histórico
  async desfazer(req, res) {
    const resultado = await HistoricoService.desfazer(
      req.params.id,
      req.user.id
    );

    res.json({
      success: true,
      message: resultado.message,
    });
  }
}

module.exports = new HistoricoController();
