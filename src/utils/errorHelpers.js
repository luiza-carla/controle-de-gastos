// Helpers para criação e manipulação de erros
const logger = require('./logger');

// Cria erro HTTP com statusCode personalizado
function criarErro(statusCode, mensagem, opcoes = {}) {
  const erro = new Error(mensagem);
  erro.statusCode = statusCode;
  erro.__mostrarAoUsuario = opcoes.__mostrarAoUsuario;

  return erro;
}

// Registra erro padronizado no console
function logarErro(contexto, erro) {
  logger.error(contexto, 'errorHelpers', erro);
}

// Retorna fallback apos logar o erro, sem interromper o fluxo
function fallbackComErro(erro, contexto, fallback = null) {
  logarErro(contexto, erro);
  return fallback;
}

module.exports = {
  criarErro,
  logarErro,
  fallbackComErro,
};
