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

  async reativarELogin(req, res) {
    const resultado = await AuthService.reativarELogin(req.body);
    setAuthCookie(res, resultado.token);
    return res.json({ usuario: resultado.usuario });
  }

  async sessao(req, res) {
    const usuario = await UserService.obterPorId(req.user.id);
    return res.json({ autenticado: true, usuario });
  }

  async logout(req, res) {
    clearAuthCookie(res);
    return res.json({ success: true });
  }

  async perfil(req, res) {
    const usuario = await UserService.obterPorId(req.user.id);
    return res.json({ usuario });
  }

  async alterarSenha(req, res) {
    await UserService.alterarSenha(req.user.id, req.body);
    return res.json({ success: true });
  }

  async atualizarPreferencias(req, res) {
    const preferencias = await UserService.atualizarPreferencias(
      req.user.id,
      req.body
    );
    return res.json({ success: true, preferencias });
  }

  async desativarConta(req, res) {
    await UserService.desativarConta(req.user.id);
    clearAuthCookie(res);
    return res.json({ success: true });
  }

  async excluirConta(req, res) {
    await UserService.excluirConta(req.user.id);
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
