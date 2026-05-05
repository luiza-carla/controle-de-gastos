const HistoricoService = require('../services/historico');

// Registra histórico de uma ação a partir do contexto da requisição.
async function registrarHistoricoDaRequisicao(req, entidade, dados) {
  await HistoricoService.registrar({
    usuario: req.user.id,
    entidade,
    metadata: HistoricoService.extrairMetadata(req),
    ...dados,
  });
}

module.exports = {
  registrarHistoricoDaRequisicao,
};
