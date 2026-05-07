const jwt = require('jsonwebtoken');
const Usuario = require('../models/Usuario');
const { criarErro } = require('../utils/errorHelpers');
const { extractAuthToken } = require('../utils/authCookie');

function extrairTokenDoHeader(authHeader) {
  if (!authHeader) {
    return null;
  }

  const [scheme, token] = authHeader.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return null;
  }

  return token;
}

// Middleware para verificar autenticação via token JWT
async function autenticacao(req, res, next) {
  const token =
    extrairTokenDoHeader(req.headers.authorization) || extractAuthToken(req);

  if (!token) {
    return next(criarErro(401, 'Não autenticado'));
  }

  try {
    // Verifica e decodifica o token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const usuario = await Usuario.findById(decoded.id)
      .select('_id ativa')
      .lean();

    if (!usuario || usuario.ativa === false) {
      return next(criarErro(401, 'Não autenticado'));
    }

    // Armazena ID do usuário na requisição para uso posterior
    req.user = { id: decoded.id };
    return next();
  } catch {
    return next(criarErro(401, 'Token inválido'));
  }
}

module.exports = autenticacao;
