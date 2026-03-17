const mongoose = require('mongoose');

const SubcategoriaSchema = new mongoose.Schema(
  {
    nome: {
      type: String,
      required: true,
    },
    categoria: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Categoria',
      required: true,
    },
    ativa: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Subcategoria', SubcategoriaSchema);
