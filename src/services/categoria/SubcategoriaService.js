const Subcategoria = require('../../models/Subcategoria');

class SubcategoriaService {
  /**
   * @param {String} categoriaId
   */
  async listarPorCategoria(categoriaId) {
    return Subcategoria.find({ categoria: categoriaId, ativa: true }).select(
      '-__v'
    );
  }
}

module.exports = new SubcategoriaService();
