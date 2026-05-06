const mongoose = require('mongoose');
const { normalizarDinheiro } = require('../utils/money');

const ListaDesejoSchema = new mongoose.Schema(
  {
    usuario: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Usuario',
      required: true,
    },

    titulo: {
      type: String,
      required: true,
    },

    valor: {
      type: Number,
      required: true,
      set: normalizarDinheiro,
    },

    categoria: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Categoria',
      required: true,
    },

    subcategoria: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subcategoria',
      required: false,
    },

    tipoDespesa: {
      type: String,
      enum: ['essencial', 'eventual', 'opcional'],
      required: false,
    },

    tags: [{ type: String }],
  },
  { timestamps: true }
);

module.exports = mongoose.model('ListaDesejo', ListaDesejoSchema);
