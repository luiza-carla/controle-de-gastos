const { criarErro } = require('../../utils/errorHelpers');

const MENSAGEM_CONTA_EM_USO =
  'Não é possível apagar a conta pois existem transações ou salários associados.';
const MENSAGEM_TRANSFERENCIA_CREDITO =
  'Transferências com cartão de crédito não são permitidas';

function validarDadosTransferencia(contaDestinoId, valor) {
  if (!contaDestinoId || !valor || valor <= 0) {
    throw criarErro(400, 'Conta destino e valor são obrigatórios');
  }
}

function validarContasTransferencia(contaOrigem, contaDestino) {
  if (!contaOrigem) {
    throw criarErro(404, 'Conta de origem não encontrada');
  }

  if (!contaDestino) {
    throw criarErro(404, 'Conta de destino não encontrada');
  }
}

function validarContaEncontrada(conta) {
  if (!conta) {
    throw criarErro(404, 'Conta não encontrada');
  }
}

module.exports = {
  MENSAGEM_CONTA_EM_USO,
  MENSAGEM_TRANSFERENCIA_CREDITO,
  validarDadosTransferencia,
  validarContasTransferencia,
  validarContaEncontrada,
};
