// Helpers para parsing e validação de query parameters
const { startOfDay, endOfDay } = require('date-fns');

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

function parseQueryDate(value, options = {}) {
  const { endOfDay: isEndOfDay = false } = options;

  if (value === undefined || value === null || value === '') {
    return null;
  }

  if (typeof value !== 'string') {
    return undefined;
  }

  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    return undefined;
  }

  const [, anoTexto, mesTexto, diaTexto] = match;
  const ano = Number(anoTexto);
  const mes = Number(mesTexto);
  const dia = Number(diaTexto);

  const dataBase = new Date(ano, mes - 1, dia);
  const data = isEndOfDay ? endOfDay(dataBase) : startOfDay(dataBase);

  if (
    Number.isNaN(data.getTime()) ||
    data.getFullYear() !== ano ||
    data.getMonth() !== mes - 1 ||
    data.getDate() !== dia
  ) {
    return undefined;
  }

  return data;
}

module.exports = {
  parseQueryInt,
  parseQueryDate,
};
