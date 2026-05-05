const HistoricoService = require('../HistoricoService');

async function registrarHistoricoConta({
  usuario,
  conta,
  contaId,
  acao,
  dadosAnteriores,
  dadosNovos,
}) {
  await HistoricoService.registrar({
    usuario,
    entidade: 'conta',
    entidadeId: contaId || conta?._id,
    acao,
    descricao: HistoricoService.formatarDescricaoConta(acao, conta),
    dadosAnteriores,
    dadosNovos,
  });
}

module.exports = { registrarHistoricoConta };
