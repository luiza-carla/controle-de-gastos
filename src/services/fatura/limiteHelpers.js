const { obterNumeroSeguro } = require('../../utils/money');

function obterLimiteTotal(cartao) {
  return obterNumeroSeguro(cartao?.limite || 0);
}

function obterLimiteDisponivel(cartao) {
  const limitePadrao = obterLimiteTotal(cartao);
  return obterNumeroSeguro(cartao?.limiteDisponivel, limitePadrao);
}

function obterTotalParcelas(transacao) {
  return Math.max(1, Number(transacao?.parcelamento?.totalParcelas || 1));
}

module.exports = {
  obterLimiteTotal,
  obterLimiteDisponivel,
  obterTotalParcelas,
};
