const Conta = require('../../models/Conta');
const { criarErro } = require('../../utils/errorHelpers');

const MENSAGEM_CONTA_NAO_ENCONTRADA = 'Conta não encontrada';

// Busca a conta do usuário e falha quando ela não existe.
async function buscarContaObrigatoria(contaId, usuarioId) {
  const conta = await Conta.findOne({ _id: contaId, usuario: usuarioId });

  if (!conta) {
    throw criarErro(404, MENSAGEM_CONTA_NAO_ENCONTRADA);
  }

  return conta;
}

module.exports = { buscarContaObrigatoria };
