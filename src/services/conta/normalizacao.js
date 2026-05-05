const { criarErro } = require('../../utils/errorHelpers');
const { contaEhCredito } = require('../../utils/contaHelpers');

const MENSAGEM_LIMITE_CREDITO_INVALIDO =
  'Limite do cartão de crédito deve ser maior que zero';

function normalizarDadosConta(dados, contaAtual = null) {
  const tipoFinal = dados.tipo || contaAtual?.tipo;
  const payload = { ...dados };

  if (contaEhCredito(tipoFinal)) {
    const limite = Number(
      Object.prototype.hasOwnProperty.call(payload, 'limite')
        ? payload.limite
        : contaAtual?.limite || 0
    );

    if (!(limite > 0)) {
      throw criarErro(400, MENSAGEM_LIMITE_CREDITO_INVALIDO);
    }

    payload.limite = limite;
    payload.limiteDisponivel = contaAtual
      ? Number(contaAtual.limiteDisponivel ?? limite)
      : limite;
    payload.diaFechamento = Number(
      payload.diaFechamento || contaAtual?.diaFechamento || 10
    );
    payload.diaVencimento = Number(
      payload.diaVencimento || contaAtual?.diaVencimento || 17
    );

    if (!contaAtual) {
      payload.saldo = 0;
    }

    return payload;
  }

  payload.limite = 0;
  payload.limiteDisponivel = 0;
  payload.diaFechamento = null;
  payload.diaVencimento = null;
  payload.dataUltimoFechamento = null;
  return payload;
}

module.exports = { normalizarDadosConta };
