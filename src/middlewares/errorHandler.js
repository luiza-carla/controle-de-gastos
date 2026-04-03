// Middleware global para padronizar respostas de erro da API
const { logarErro } = require('../utils/errorHelpers');

function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  let status = err.statusCode || err.status || 500;

  // Erros de validação/cast do Mongoose devem retornar 400
  if (err.name === 'ValidationError' || err.name === 'CastError') {
    status = 400;
  }

  // Só loga erros internos da aplicação; erros 4xx são esperados pelo fluxo.
  if (status >= 500) {
    logarErro('errorHandler', err);
  }

  const mensagem =
    status >= 500 ? 'Erro interno do servidor' : err.message || 'Requisição inválida';
  return res.status(status).json({ mensagem });
}

module.exports = errorHandler;
