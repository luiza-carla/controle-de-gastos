const AuthService = require('../services/auth');
const UserService = require('../services/user');
const { setAuthCookie, clearAuthCookie } = require('../utils/authCookie');

class UserController {
  // Registra novo usuário
  async registrar(req, res) {
    const resultado = await AuthService.registrar(req.body);
    setAuthCookie(res, resultado.token);
    return res.status(201).json({ usuario: resultado.usuario });
  }

  // Realiza login do usuário
  async login(req, res) {
    const resultado = await AuthService.login(req.body);
    setAuthCookie(res, resultado.token);
    return res.json({ usuario: resultado.usuario });
  }

  async sessao(req, res) {
    return res.json({ autenticado: true });
  }

  async logout(req, res) {
    clearAuthCookie(res);
    return res.json({ success: true });
  }

  // Lista todos os usuários
  async listar(req, res) {
    const usuarios = await UserService.listar();
    return res.json(usuarios);
  }
}

module.exports = new UserController();
