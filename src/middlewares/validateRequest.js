const { criarErro } = require('../utils/errorHelpers');

function validateBody(schema) {
  return (req, res, next) => {
    const parsed = schema.safeParse(req.body);

    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message || 'Payload inválido';
      return next(criarErro(400, message));
    }

    req.body = parsed.data;
    return next();
  };
}

module.exports = {
  validateBody,
};