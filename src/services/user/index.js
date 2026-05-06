const Usuario = require('../../models/Usuario');

class UserService {
  // Lista todos os usuários sem expor a senha.
  async listar() {
    return Usuario.find().select('-senha');
  }
}

module.exports = new UserService();
