import { normalizarDinheiro } from '../helpers/money.js';

/**
 * Retorna a classe CSS que representa o estado do saldo projetado
 * (positivo / negativo / zero).
 * @param {number|string} valor
 * @returns {string}
 */
export function getSaldoProjetadoClass(valor) {
  const numero = normalizarDinheiro(valor || 0);
  if (numero < 0) return 'saldo-projetado-negativo';
  if (numero > 0) return 'saldo-projetado-positivo';
  return 'saldo-projetado-zero';
}

/**
 * Concatena categoria e subcategoria (quando presente) em um texto legível.
 * @param {string} categoria
 * @param {string} subcategoria
 */
export function formatarCategoriaComSubcategoria(categoria, subcategoria) {
  if (!categoria) return '';
  return subcategoria ? `${categoria} / ${subcategoria}` : categoria;
}
