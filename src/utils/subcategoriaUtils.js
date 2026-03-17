const Subcategoria = require('../models/Subcategoria');

/**
 * Verifica se uma subcategoria pertence a uma categoria.
 * @param {string} subcategoriaId
 * @param {string} categoriaId
 * @returns {Promise<boolean>}
 */
async function validarSubcategoriaParaCategoria(subcategoriaId, categoriaId) {
  if (!subcategoriaId) return true;
  if (!categoriaId) return false;
  const sub = await Subcategoria.findOne({
    _id: subcategoriaId,
    categoria: categoriaId,
  });
  return !!sub;
}

/**
 * Quando a categoria é alterada, garante que não fique uma subcategoria de outra categoria.
 * Também trata caso em que subcategoria seja enviada como string vazia para remoção.
 *
 * @param {object} params
 * @param {object} params.updateData Dados recebidos do cliente (mutável)
 * @param {object} params.docAntigo Documento existente no banco que deve ser considerado (possui subcategoria)
 * @returns {{unsetOps: object}} Um objeto com operações $unset a aplicar.
 */
async function processarSubcategoriaAoAtualizar({ updateData, docAntigo }) {
  const unsetOps = {};

  if ('subcategoria' in updateData && !updateData.subcategoria) {
    unsetOps.subcategoria = '';
    delete updateData.subcategoria;
  }

  if (
    updateData.categoria &&
    !Object.prototype.hasOwnProperty.call(updateData, 'subcategoria') &&
    docAntigo?.subcategoria
  ) {
    const subExistente = await Subcategoria.findById(docAntigo.subcategoria);
    if (
      subExistente &&
      String(subExistente.categoria) !== String(updateData.categoria)
    ) {
      unsetOps.subcategoria = '';
    }
  }

  return { unsetOps };
}

/**
 * Retorna as subcategorias que pertencem à categoria especificada.
 *
 * @param {Array} subcategorias Lista de subcategorias (geralmente carregada do banco)
 * @param {string} categoriaId Id da categoria
 * @param {object} opts
 * @param {string[]} [opts.excluirNomes] Nomes de subcategorias a serem excluídos
 */
function filtrarSubcategoriasPorCategoria(
  subcategorias,
  categoriaId,
  { excluirNomes = [] } = {}
) {
  if (!Array.isArray(subcategorias) || !categoriaId) return [];

  return subcategorias.filter(
    (s) =>
      String(s.categoria) === String(categoriaId) &&
      !excluirNomes.includes(s.nome)
  );
}

module.exports = {
  validarSubcategoriaParaCategoria,
  processarSubcategoriaAoAtualizar,
  filtrarSubcategoriasPorCategoria,
};
