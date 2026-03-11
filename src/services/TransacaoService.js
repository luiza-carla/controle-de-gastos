const Transacao = require('../models/Transacao');
const { criarErro } = require('../utils/errorHelpers');

class TransacaoService {
  // Cria nova transação
  async criar(dados, usuarioId) {
    return Transacao.create({
      ...dados,
      usuario: usuarioId,
    });
  }

  // Lista todas as transações do usuário com dados relacionados
  async listar(usuarioId) {
    // reutiliza helper central para manter consistência
    const query = Transacao.find({ usuario: usuarioId })
      .sort({ data: -1, createdAt: -1 })
      .select('-__v');
    const {
      transacao: populateTransacao,
    } = require('../utils/populateHelpers');
    return populateTransacao(query);
  }

  // Atualiza transação existente
  async atualizar(id, dados, usuarioId) {
    const transacao = await Transacao.findOneAndUpdate(
      { _id: id, usuario: usuarioId },
      dados,
      { returnDocument: 'after' }
    );

    if (!transacao) {
      throw criarErro(404, 'Transação não encontrada');
    }

    return transacao;
  }

  // Deleta transação
  async deletar(id, usuarioId) {
    const transacao = await Transacao.findOneAndDelete({
      _id: id,
      usuario: usuarioId,
    });

    if (!transacao) {
      throw criarErro(404, 'Transação não encontrada');
    }

    return transacao;
  }
}

module.exports = new TransacaoService();
