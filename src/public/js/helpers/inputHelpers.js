// Helper para aplicar máscara de moeda

import { warn } from './logger.js';

const IMASK_SRC = '/vendor/imask/imask.min.js';

let imaskLoaded = false;

/**
 * Garante que o IMask esteja carregado na página.
 */
export async function ensureIMask() {
  if (imaskLoaded && window.IMask) return window.IMask;

  if (window.IMask) {
    imaskLoaded = true;
    return window.IMask;
  }

  return new Promise((resolve) => {
    const existing = document.querySelector(`script[src="${IMASK_SRC}"]`);
    if (existing) {
      existing.addEventListener('load', () => {
        imaskLoaded = true;
        resolve(window.IMask);
      });
      existing.addEventListener('error', () => resolve(null));
      return;
    }

    const script = document.createElement('script');
    script.src = IMASK_SRC;
    script.onload = () => {
      imaskLoaded = true;
      resolve(window.IMask);
    };
    script.onerror = () => resolve(null);
    document.head.appendChild(script);
  });
}

/**
 * Converte valor formatado em pt-BR
 */
export function parseCurrency(value) {
  if (value == null) return NaN;

  if (typeof value === 'number' && !Number.isNaN(value)) {
    return value;
  }

  const str = String(value).trim();
  if (!str) return NaN;

  // Se houver vírgula, assumimos formato pt-BR
  if (str.includes(',')) {
    return parseFloat(str.replace(/\./g, '').replace(/,/g, '.'));
  }

  // Se não houver vírgula, pode ser um número em formato en-US (ex: 101.54)
  // ou um valor já formatado com separadores de milhar (ex: 1.015.415.950.866.302).
  // Se houver mais de um ponto, assumimos que todos são separadores de milhar.
  const dots = (str.match(/\./g) || []).length;
  if (dots > 1) {
    return parseFloat(str.replace(/\./g, ''));
  }

  // Se houver exatamente um ponto, pode ser separador decimal (en-US) ou separador de milhar (pt-BR).
  // Para evitar interpretar "100.000" como cem, tratamos como milhar quando houver exatamente 3 dígitos após o ponto.
  if (dots === 1) {
    const afterDot = str.split('.').pop();
    if (/^\d{3}$/.test(afterDot)) {
      return parseFloat(str.replace(/\./g, ''));
    }
  }

  // Caso contrário, interpreta o ponto como separador decimal.
  return parseFloat(str);
}

/**
 * Aplica máscara de moeda em um input
 */
export async function bindCurrencyInput(input, { decimals = 2 } = {}) {
  if (!input) return;

  const IMaskLib = await ensureIMask();
  if (!IMaskLib) return;

  // Atribui o valor inicial formatado antes de criar a máscara
  const maskOptions = {
    mask: Number,
    scale: decimals,
    signed: false,
    thousandsSeparator: '.',
    radix: ',',
    mapToRadix: [','],
    normalizeZeros: true,
    padFractionalZeros: false,
    // Mantém o cursor correto enquanto digita
    overwrite: true,
  };

  try {
    if (input._currencyMask) {
      input._currencyMask.destroy();
      input._currencyMask = null;
    }

    input._currencyMask = IMaskLib(input, maskOptions);
  } catch (err) {
    // Se falhar, não trava a aplicação
    warn('Não foi possível aplicar máscara de moeda', 'inputHelpers', err);
  }
}

/**
 * Encontra todos os inputs com `data-moeda` e aplica máscara de moeda.
 */
export async function bindCurrencyInputs({
  root = document,
  selector = 'input[data-moeda]',
  decimals = 2,
} = {}) {
  if (!root || typeof root.querySelectorAll !== 'function') return;

  const inputs = Array.from(root.querySelectorAll(selector));
  if (!inputs.length) return;

  const bindPromises = inputs.map((input) =>
    bindCurrencyInput(input, { decimals })
  );
  await Promise.all(bindPromises);
}
