const SaldoService = require('../SaldoService');
const { criarErro } = require('../../utils/errorHelpers');
const { contaEhCredito } = require('../../utils/contaHelpers');

const MENSAGEM_TRANSFERENCIA_CREDITO =
  'Transferências com cartão de crédito não são permitidas';

function validarTransferencia(conta, carteira, valor, direcao) {
  if (!conta) throw criarErro(404, 'Conta não encontrada');
  if (contaEhCredito(conta))
    throw criarErro(400, MENSAGEM_TRANSFERENCIA_CREDITO);
  if (direcao === 'carteira-para-conta' && carteira.saldo < valor) {
    throw criarErro(400, 'Saldo insuficiente na carteira');
  }
}

async function executarTransferencia(
  carteira,
  conta,
  valor,
  direcao,
  usuarioId
) {
  if (direcao === 'carteira-para-conta') {
    carteira.saldo -= valor;
    await SaldoService.aplicarDeltaContas(
      { [conta._id]: Number(valor) },
      usuarioId
    );
  } else {
    carteira.saldo += valor;
    await SaldoService.aplicarDeltaContas(
      { [conta._id]: -Number(valor) },
      usuarioId
    );
  }
  await carteira.save();
}

module.exports = { validarTransferencia, executarTransferencia };
