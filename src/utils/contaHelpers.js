const TIPO_CONTA_CREDITO = 'credito';

function obterTipoConta(contaOuTipo) {
  if (!contaOuTipo) {
    return null;
  }

  if (typeof contaOuTipo === 'string') {
    return contaOuTipo;
  }

  return contaOuTipo.tipo || null;
}

function contaEhCredito(contaOuTipo) {
  return obterTipoConta(contaOuTipo) === TIPO_CONTA_CREDITO;
}

function filtrarContasNaoCredito(contas = []) {
  return (contas || []).filter((conta) => !contaEhCredito(conta));
}

module.exports = {
  TIPO_CONTA_CREDITO,
  obterTipoConta,
  contaEhCredito,
  filtrarContasNaoCredito,
};
