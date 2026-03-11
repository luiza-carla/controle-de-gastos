const HistoricoService = require('../services/HistoricoService');
const { parseQueryInt } = require('../utils/queryHelpers');

class HistoricoController {
  // Lista histórico do usuário logado
  async listar(req, res) {
    const filtros = {
      entidade: req.query.entidade,
      acao: req.query.acao,
      desfeito: req.query.desfeito,
      limit: parseQueryInt(req.query.limit, 50),
      skip: parseQueryInt(req.query.skip, 0),
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
      entidadeId
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

  // Limpa histórico antigo (endpoint de manutenção)
  async limparAntigo(req, res) {
    const dias = parseQueryInt(req.query.dias, 30);
    const deletados = await HistoricoService.limparAntigo(dias);

    res.json({
      success: true,
      message: `${deletados} registros de histórico removidos (retenção: ${dias} dias)`,
      deletados,
    });
  }
}

module.exports = new HistoricoController();
