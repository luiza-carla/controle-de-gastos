const mongoose = require('mongoose');
const Categoria = require('../models/Categoria');

class CategoriaService {
  // Lista categorias ativas (excluindo salário)
  async listar() {
    return Categoria.find({
      ativa: true,
      nome: mongoose.trusted({ $ne: 'Salário' }),
    })
      .setOptions({ sanitizeFilter: false })
      .select('-__v');
  }
}

module.exports = new CategoriaService();
