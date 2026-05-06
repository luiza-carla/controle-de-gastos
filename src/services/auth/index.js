const bcrypt = require('bcryptjs');
const Usuario = require('../../models/Usuario');
const { criarErro } = require('../../utils/errorHelpers');
const { gerarToken } = require('./token');
const { montarRespostaAutenticacao } = require('./response');

class AuthService {
  // Registra novo usuário com hash de senha.
  async registrar(dados) {
    const { nome, email, senha, salario } = dados;

    // Valida se email já existe.
    const usuarioExistente = await Usuario.findOne({ email: String(email) });
    if (usuarioExistente) {
      throw criarErro(409, 'Email já cadastrado');
    }

    // Cria novo usuário com senha protegida por hash.
    const senhaHash = await bcrypt.hash(senha, 10);
    const novoUsuario = await Usuario.create({
      nome,
      email,
      senha: senhaHash,
      salario,
    });

    const token = gerarToken(novoUsuario._id);
    return montarRespostaAutenticacao(novoUsuario, token);
  }

  // Realiza login validando credenciais e retornando token.
  async login(dados) {
    const { email, senha } = dados;

    // Busca usuário por email.
    const usuario = await Usuario.findOne({ email: String(email) });
    if (!usuario) {
      throw criarErro(401, 'Credenciais inválidas');
    }

    // Valida senha com hash.
    const senhaValida = await bcrypt.compare(senha, usuario.senha);
    if (!senhaValida) {
      throw criarErro(401, 'Credenciais inválidas');
    }

    const token = gerarToken(usuario._id);
    return montarRespostaAutenticacao(usuario, token);
  }
}

module.exports = new AuthService();
