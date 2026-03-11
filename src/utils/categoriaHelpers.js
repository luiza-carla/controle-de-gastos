const Categoria = require('../models/Categoria');

// helpers para trabalhar com categorias de forma centralizada

/**
 * Busca uma categoria pelo nome exatamente igual.
 * @param {string} nome
 * @returns {Promise<import('../models/Categoria')>}
 */
async function buscarPorNome(nome) {
  return Categoria.findOne({ nome });
}

/**
 * Busca a categoria utilizada para representar salários no sistema.
 * Retorna `null` se não existir.
 */
async function buscarSalario() {
  return buscarPorNome('Salário');
}

module.exports = {
  buscarPorNome,
  buscarSalario,
};
