const jwt = require('jsonwebtoken');

// Gera token JWT padrão para autenticação.
function gerarToken(usuarioId) {
  return jwt.sign({ id: usuarioId }, process.env.JWT_SECRET, {
    expiresIn: '7d',
  });
}

module.exports = { gerarToken };
