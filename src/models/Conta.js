const mongoose = require('mongoose');
const { normalizarDinheiro } = require('../utils/money');

const ContaSchema = new mongoose.Schema(
  {
    usuario: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Usuario',
      required: true,
    },

    nome: {
      type: String,
      required: true,
    },

    tipo: {
      type: String,
      enum: ['corrente', 'credito', 'investimento'],
      required: true,
    },

    saldo: {
      type: Number,
      default: 0,
      set: normalizarDinheiro,
    },

    limite: {
      type: Number,
      default: 0,
      min: 0,
      set: normalizarDinheiro,
    },

    limiteDisponivel: {
      type: Number,
      default: 0,
      min: 0,
      set: normalizarDinheiro,
    },

    diaFechamento: {
      type: Number,
      min: 1,
      max: 31,
      default: 10,
    },

    diaVencimento: {
      type: Number,
      min: 1,
      max: 31,
      default: 17,
    },

    dataUltimoFechamento: {
      type: Date,
      default: null,
    },

    ativa: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Conta', ContaSchema);
