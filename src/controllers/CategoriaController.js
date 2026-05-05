const CategoriaService = require('../services/categoria/CategoriaService');

class CategoriaController {
  // Lista todas as categorias
  async listar(req, res) {
    const categorias = await CategoriaService.listar();
    return res.json(categorias);
  }
}

module.exports = new CategoriaController();
