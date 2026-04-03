const rateLimit = require('express-rate-limit');

const WINDOW_MS = Number(
  process.env.AUTH_RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000
);
const MAX_REQUESTS = Number(process.env.AUTH_RATE_LIMIT_MAX || 10);

const authRateLimit = rateLimit({
  windowMs: WINDOW_MS,
  limit: MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    mensagem: 'Muitas tentativas. Aguarde alguns minutos e tente novamente.',
  },
});

module.exports = {
  authRateLimit,
};
