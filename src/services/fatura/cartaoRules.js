const Conta = require('../../models/Conta');
const { criarErro } = require('../../utils/errorHelpers');
const { contaEhCredito } = require('../../utils/contaHelpers');
const { extrairContaId } = require('../../utils/salarioHelpers');
const {
  obterNumeroSeguro,
  subtrairDinheiro,
  somarDinheiro,
} = require('../../utils/money');
const { obterLimiteDisponivel } = require('./limiteHelpers');

const MENSAGEM_LIMITE_CREDITO = 'Limite insuficiente no cartão de crédito';
const MENSAGEM_TRANSACAO_CREDITO_INVALIDA =
  'Cartão de crédito só permite compras de saída';
const MENSAGEM_CONTA_CREDITO_INVALIDA =
  'Conta informada não é um cartão de crédito';

async function buscarCartaoCredito(contaId, usuarioId) {
  const cartao = await Conta.findOne({ _id: contaId, usuario: usuarioId });

  if (!cartao) {
    throw criarErro(404, 'Conta não encontrada');
  }

  if (!contaEhCredito(cartao)) {
    throw criarErro(400, MENSAGEM_CONTA_CREDITO_INVALIDA);
  }

  return cartao;
}

async function obterCartaoDaTransacao(transacao, usuarioId) {
  if (!transacao || transacao.fonteSaldo !== 'conta') {
    return null;
  }

  const contaId = extrairContaId(transacao.conta);
  if (!contaId) {
    return null;
  }

  const conta = await Conta.findOne({ _id: contaId, usuario: usuarioId });
  if (!contaEhCredito(conta)) {
    return null;
  }

  return conta;
}

async function obterValorEmAbertoDaTransacao(transacao, usuarioId) {
  if (!transacao || transacao.fonteSaldo !== 'conta') {
    return 0;
  }

  if ((transacao.status || 'pago') !== 'pago' || transacao.tipo !== 'saida') {
    return 0;
  }

  if (!transacao._id) {
    return obterNumeroSeguro(transacao.valor);
  }

  const parcelas = await this.listarParcelasDaTransacao(
    transacao._id,
    usuarioId
  );
  if (!parcelas.length) {
    return obterNumeroSeguro(transacao.valor);
  }

  return parcelas.reduce(
    (total, parcela) =>
      somarDinheiro(
        total,
        Math.max(subtrairDinheiro(parcela.valor, parcela.valorPago), 0)
      ),
    0
  );
}

async function validarTransacaoProjetada({
  usuarioId,
  transacaoAnterior = null,
  transacaoNova = null,
}) {
  const contaIds = new Set();

  const contaIdAnterior = extrairContaId(transacaoAnterior?.conta);
  const contaIdNova = extrairContaId(transacaoNova?.conta);

  if (contaIdAnterior) {
    const contaAnterior = await Conta.findOne({
      _id: contaIdAnterior,
      usuario: usuarioId,
    });
    if (contaEhCredito(contaAnterior)) {
      contaIds.add(String(contaIdAnterior));
    }
  }

  if (contaIdNova) {
    const contaNova = await Conta.findOne({
      _id: contaIdNova,
      usuario: usuarioId,
    });
    if (contaEhCredito(contaNova)) {
      contaIds.add(String(contaIdNova));
    }
  }

  for (const contaId of contaIds) {
    const cartao = await this.buscarCartaoCredito(contaId, usuarioId);

    if (
      transacaoNova &&
      String(extrairContaId(transacaoNova.conta)) === String(contaId) &&
      transacaoNova.tipo !== 'saida'
    ) {
      throw criarErro(400, MENSAGEM_TRANSACAO_CREDITO_INVALIDA);
    }

    const valorRestauradoAnterior =
      transacaoAnterior &&
      String(extrairContaId(transacaoAnterior.conta)) === String(contaId)
        ? await this.obterValorEmAbertoDaTransacao(transacaoAnterior, usuarioId)
        : 0;

    const valorNovo =
      transacaoNova &&
      String(extrairContaId(transacaoNova.conta)) === String(contaId) &&
      (transacaoNova.status || 'pago') === 'pago' &&
      transacaoNova.tipo === 'saida'
        ? obterNumeroSeguro(transacaoNova.valor)
        : 0;

    const limiteProjetado = subtrairDinheiro(
      somarDinheiro(obterLimiteDisponivel(cartao), valorRestauradoAnterior),
      valorNovo
    );

    if (limiteProjetado < 0) {
      throw criarErro(400, MENSAGEM_LIMITE_CREDITO);
    }
  }
}

module.exports = {
  buscarCartaoCredito,
  obterCartaoDaTransacao,
  obterValorEmAbertoDaTransacao,
  validarTransacaoProjetada,
  MENSAGEM_LIMITE_CREDITO,
  MENSAGEM_TRANSACAO_CREDITO_INVALIDA,
  MENSAGEM_CONTA_CREDITO_INVALIDA,
};
