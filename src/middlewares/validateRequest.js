const { criarErro } = require('../utils/errorHelpers');

function createValidator(source, schema, fallbackMessage) {
  return (req, res, next) => {
    const parsed = schema.safeParse(req[source]);

    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message || fallbackMessage;
      return next(criarErro(400, message));
    }

    req[source] = parsed.data;
    return next();
  };
}

function validateBody(schema) {
  return createValidator('body', schema, 'Payload inválido');
}

function validateQuery(schema) {
  return createValidator('query', schema, 'Query inválida');
}

function validateParams(schema) {
  return createValidator('params', schema, 'Parâmetros inválidos');
}

module.exports = {
  validateBody,
  validateQuery,
  validateParams,
};