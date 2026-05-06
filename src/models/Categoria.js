const mongoose = require('mongoose');

const CategoriaSchema = new mongoose.Schema(
  {
    nome: {
      type: String,
      required: true,
      unique: true,
    },

    cor: {
      type: String,
      default: '#000000',
    },
    slug: {
      type: String,
      required: true,
      unique: true,
    },
    ativa: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Categoria', CategoriaSchema);
