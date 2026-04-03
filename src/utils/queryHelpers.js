// Helpers para parsing e validação de query parameters

// Converte query parameter para inteiro com fallback e aplica limites.
function parseQueryInt(value, fallback = 0, options = {}) {
  const { min = Number.MIN_SAFE_INTEGER, max = Number.MAX_SAFE_INTEGER } =
    options;
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) {
    return fallback;
  }

  return Math.min(Math.max(parsed, min), max);
}

module.exports = {
  parseQueryInt,
};
