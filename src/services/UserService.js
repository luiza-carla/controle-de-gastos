const Usuario = require('../models/Usuario');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { criarErro } = require('../utils/errorHelpers');

class UsuarioService {
  // Gera token JWT padrão para autenticação
  gerarToken(usuarioId) {
    return jwt.sign({ id: usuarioId }, process.env.JWT_SECRET, {
      expiresIn: '7d',
    });
  }

  // Monta payload de autenticação com token e dados públicos do usuário
  montarRespostaAutenticacao(usuario, token) {
    return {
      token,
      usuario: {
        id: usuario._id,
        nome: usuario.nome,
        email: usuario.email,
        salario: usuario.salario,
      },
    };
  }

  // Registra novo usuário com hash de senha
  async registrar(dados) {
    const { nome, email, senha, salario } = dados;

    // Valida se email já existe
    const usuarioExistente = await Usuario.findOne({ email: String(email) });
    if (usuarioExistente) {
      throw criarErro(409, 'Email já cadastrado');
    }

    // Cria hash da senha
    const senhaHash = await bcrypt.hash(senha, 10);

    // Cria novo usuário no banco
    const novoUsuario = await Usuario.create({
      nome,
      email,
      senha: senhaHash,
      salario,
    });

    const token = this.gerarToken(novoUsuario._id);
    return this.montarRespostaAutenticacao(novoUsuario, token);
  }

  // Realiza login validando credenciais e retornando token
  async login(dados) {
    const { email, senha } = dados;

    // Busca usuário por email
    const usuario = await Usuario.findOne({ email: String(email) });
    if (!usuario) {
      throw criarErro(401, 'Credenciais inválidas');
    }

    // Valida senha com hash
    const senhaValida = await bcrypt.compare(senha, usuario.senha);
    if (!senhaValida) {
      throw criarErro(401, 'Credenciais inválidas');
    }

    const token = this.gerarToken(usuario._id);
    return this.montarRespostaAutenticacao(usuario, token);
  }

  // Lista todos os usuários (sem expor senhas)
  async listar() {
    return Usuario.find().select('-senha');
  }
}

module.exports = new UsuarioService();
