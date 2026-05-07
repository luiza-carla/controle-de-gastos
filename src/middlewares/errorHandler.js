// Middleware global para padronizar respostas de erro da API
const { logarErro } = require('../utils/errorHelpers');

function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);

  let status = err.statusCode || err.status || 500;

  const isErroBug = err.name === 'ValidationError' || err.name === 'CastError';

  if (isErroBug) {
    status = 400;
    logarErro('errorHandler', err);
  } else if (status >= 500) {
    logarErro('errorHandler', err);
  }

  let mensagem;

  if (err.__mostrarAoUsuario === true) {
    mensagem = err.message;
  } else if (err.__mostrarAoUsuario === false) {
    mensagem = 'Erro interno do servidor';
  } else if (status >= 500 || isErroBug) {
    mensagem = 'Erro interno do servidor';
  } else {
    mensagem = err.message || 'Requisição inválida';
  }

  const payload = { mensagem };
  if (err.code) {
    payload.codigo = err.code;
  }

  return res.status(status).json(payload);
}

module.exports = errorHandler;
