const { formatISO } = require('date-fns');

function buildPrefix(level, contexto) {
  const timestamp = formatISO(new Date());
  const nivel = String(level || 'log').toUpperCase();
  const escopo = contexto ? ` [${contexto}]` : '';
  return `[${timestamp}] [${nivel}]${escopo}`;
}

function info(mensagem, contexto, ...detalhes) {
  console.log(buildPrefix('info', contexto), mensagem, ...detalhes);
}

function warn(mensagem, contexto, ...detalhes) {
  console.warn(buildPrefix('warn', contexto), mensagem, ...detalhes);
}

function error(mensagem, contexto, ...detalhes) {
  console.error(buildPrefix('error', contexto), mensagem, ...detalhes);
}

module.exports = {
  info,
  warn,
  error,
};
