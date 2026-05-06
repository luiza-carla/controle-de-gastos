const { extrairContaId } = require('../../utils/salarioHelpers');
const { normalizarDinheiro } = require('../../utils/money');

// Calcula o impacto da transação no saldo considerando apenas itens pagos.
function obterDeltaAplicado(transacao) {
  if (!transacao) {
    return 0;
  }

  const status = transacao.status || 'pago';
  if (status !== 'pago') {
    return 0;
  }

  const valor = normalizarDinheiro(transacao.valor || 0);
  if (!valor) {
    return 0;
  }

  return transacao.tipo === 'entrada' ? valor : -valor;
}

// Retorna a conta afetada pela transação quando a fonte de saldo é conta.
function obterContaIdTransacao(transacao) {
  if (!transacao || transacao.fonteSaldo === 'carteira') {
    return null;
  }

  return extrairContaId(transacao.conta);
}

// Isola o delta da transação para uma conta específica.
function obterDeltaAplicadoConta(transacao, contaId) {
  const contaIdTransacao = obterContaIdTransacao(transacao);
  if (!contaIdTransacao || String(contaIdTransacao) !== String(contaId)) {
    return 0;
  }

  return obterDeltaAplicado(transacao);
}

/**
 * Calcula quanto da transação afetaria a carteira (positivos para entradas
 * pagas, negativos para saídas pagas).
 */
function obterDeltaAplicadoCarteira(transacao) {
  if (!transacao || transacao.fonteSaldo !== 'carteira') {
    return 0;
  }

  return obterDeltaAplicado(transacao);
}

module.exports = {
  obterDeltaAplicado,
  obterContaIdTransacao,
  obterDeltaAplicadoConta,
  obterDeltaAplicadoCarteira,
};
