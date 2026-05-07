const Usuario = require('../../models/Usuario');
const Conta = require('../../models/Conta');
const Transacao = require('../../models/Transacao');
const Historico = require('../../models/Historico');
const ListaDesejo = require('../../models/ListaDesejo');
const Carteira = require('../../models/Carteira');
const Fatura = require('../../models/Fatura');
const Parcela = require('../../models/Parcela');
const bcrypt = require('bcryptjs');
const { criarErro } = require('../../utils/errorHelpers');

class UserService {
  // Lista todos os usuários sem expor a senha.
  async listar() {
    return Usuario.find().select('-senha');
  }

  async obterPorId(usuarioId) {
    const usuario = await Usuario.findById(usuarioId)
      .select('nome email createdAt ativa preferencias')
      .lean();

    if (!usuario) {
      throw criarErro(404, 'Usuário não encontrado');
    }

    return {
      ...usuario,
      ativa: usuario.ativa !== false,
      preferencias: {
        formatoData: usuario?.preferencias?.formatoData || 'DD/MM/AAAA',
      },
    };
  }

  async atualizarPreferencias(usuarioId, { formatoData }) {
    const usuario = await Usuario.findById(usuarioId);

    if (!usuario || usuario.ativa === false) {
      throw criarErro(404, 'Usuário não encontrado');
    }

    usuario.preferencias = {
      ...(usuario.preferencias || {}),
      formatoData,
    };

    await usuario.save();

    return {
      formatoData: usuario.preferencias.formatoData || 'DD/MM/AAAA',
    };
  }

  async alterarSenha(usuarioId, { senhaAtual, novaSenha }) {
    const usuario = await Usuario.findById(usuarioId);

    if (!usuario || usuario.ativa === false) {
      throw criarErro(404, 'Usuário não encontrado');
    }

    const senhaValida = await bcrypt.compare(senhaAtual, usuario.senha);
    if (!senhaValida) {
      throw criarErro(400, 'A senha atual está incorreta');
    }

    usuario.senha = await bcrypt.hash(novaSenha, 10);
    await usuario.save();
  }

  async desativarConta(usuarioId) {
    const usuario = await Usuario.findById(usuarioId);

    if (!usuario) {
      throw criarErro(404, 'Usuário não encontrado');
    }

    if (usuario.ativa === false) {
      throw criarErro(409, 'Esta conta já está desativada');
    }

    usuario.ativa = false;
    await usuario.save();
  }

  async excluirConta(usuarioId) {
    const usuario = await Usuario.findById(usuarioId).select('_id');

    if (!usuario) {
      throw criarErro(404, 'Usuário não encontrado');
    }

    await Promise.all([
      Parcela.deleteMany({ usuario: usuarioId }),
      Fatura.deleteMany({ usuario: usuarioId }),
      Transacao.deleteMany({ usuario: usuarioId }),
      Historico.deleteMany({ usuario: usuarioId }),
      ListaDesejo.deleteMany({ usuario: usuarioId }),
      Conta.deleteMany({ usuario: usuarioId }),
      Carteira.deleteMany({ usuario: usuarioId }),
    ]);

    await Usuario.deleteOne({ _id: usuarioId });
  }
}

module.exports = new UserService();
