const SubcategoriaService = require('../services/categoria/SubcategoriaService');

class SubcategoriaController {
  async listarPorCategoria(req, res) {
    const categoriaId = req.params.id;
    const subcategorias =
      await SubcategoriaService.listarPorCategoria(categoriaId);
    res.json(subcategorias);
  }
}

module.exports = new SubcategoriaController();
