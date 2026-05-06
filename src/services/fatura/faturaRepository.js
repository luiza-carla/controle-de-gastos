const Fatura = require('../../models/Fatura');
const Parcela = require('../../models/Parcela');
const { somarDinheiro } = require('../../utils/money');
const { obterPeriodoFatura } = require('../../utils/faturaHelpers');
const { STATUS_FATURA, atualizarStatusFatura } = require('./statusHelpers');
const {
  construirParcelasDaTransacao,
  obterDadosBaseParcelas,
} = require('./parcelaHelpers');

async function obterOuCriarFaturaAberta({ usuarioId, cartao, dataReferencia }) {
  const periodo = obterPeriodoFatura(
    dataReferencia,
    cartao.diaFechamento,
    cartao.diaVencimento
  );

  const filtro = {
    usuario: usuarioId,
    conta: cartao._id,
    periodoInicio: periodo.periodoInicio,
    periodoFim: periodo.periodoFim,
  };

  let fatura = await Fatura.findOne(filtro);
  if (!fatura) {
    fatura = await Fatura.create({
      ...filtro,
      dataFechamento: periodo.dataFechamento,
      dataVencimento: periodo.dataVencimento,
      valorTotal: 0,
      valorPago: 0,
      status: STATUS_FATURA.ABERTA,
    });
  }

  return fatura;
}

async function recalcularFatura(faturaId, dataReferencia = new Date()) {
  const fatura = await Fatura.findById(faturaId);
  if (!fatura) {
    return null;
  }

  const parcelas = await Parcela.find({ fatura: fatura._id });
  fatura.valorTotal = parcelas.reduce(
    (total, parcela) => somarDinheiro(total, parcela.valor),
    0
  );
  fatura.valorPago = parcelas.reduce(
    (total, parcela) => somarDinheiro(total, parcela.valorPago),
    0
  );

  atualizarStatusFatura(fatura, dataReferencia);
  await fatura.save();
  return fatura;
}

function listarParcelasDaTransacao(transacaoId, usuarioId) {
  return Parcela.find({
    usuario: usuarioId,
    transacao: transacaoId,
  }).sort({ numeroParcela: 1, dataCobranca: 1 });
}

module.exports = {
  obterOuCriarFaturaAberta,
  recalcularFatura,
  listarParcelasDaTransacao,
  construirParcelasDaTransacao,
  obterDadosBaseParcelas,
};
