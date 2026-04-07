export const TIPO_CONTA_CREDITO = 'credito';

export function obterTipoConta(contaOuTipo) {
  if (!contaOuTipo) {
    return null;
  }

  if (typeof contaOuTipo === 'string') {
    return contaOuTipo;
  }

  return contaOuTipo.tipo || null;
}

export function contaEhCredito(contaOuTipo) {
  return obterTipoConta(contaOuTipo) === TIPO_CONTA_CREDITO;
}

export function contaSelecionadaEhCredito(selectConta) {
  return (
    selectConta?.selectedOptions?.[0]?.dataset?.tipo === TIPO_CONTA_CREDITO
  );
}

export function filtrarContasNaoCredito(contas = []) {
  return (contas || []).filter((conta) => !contaEhCredito(conta));
}
