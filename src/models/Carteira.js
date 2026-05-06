const mongoose = require('mongoose');
const { normalizarDinheiro } = require('../utils/money');

const CarteiraSchema = new mongoose.Schema(
  {
    usuario: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Usuario',
      required: true,
      unique: true,
    },

    saldo: {
      type: Number,
      default: 0,
      set: normalizarDinheiro,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Carteira', CarteiraSchema);
