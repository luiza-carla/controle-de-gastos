const jwt = require('jsonwebtoken');
const { criarErro } = require('../utils/errorHelpers');

// Middleware para verificar autenticação via token JWT
function autenticacao(req, res, next) {
  // Extrai header de autorização
  const authHeader = req.headers.authorization;

  // Valida se token foi fornecido
  if (!authHeader) {
    const mensagem = `Token não fornecido (${req.method} ${req.originalUrl})`;
    return next(criarErro(401, mensagem));
  }

  // Extrai token do formato "Bearer <token>"
  const token = authHeader.split(' ')[1];

  try {
    // Verifica e decodifica o token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Armazena ID do usuário na requisição para uso posterior
    req.user = { id: decoded.id };
    return next();
  } catch {
    return next(criarErro(401, 'Token inválido'));
  }
}

module.exports = autenticacao;
