const mongoose = require('mongoose');

const ParcelaSchema = new mongoose.Schema(
  {
    usuario: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Usuario',
      required: true,
      index: true,
    },

    transacao: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Transacao',
      required: true,
      index: true,
    },

    conta: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conta',
      required: true,
      index: true,
    },

    fatura: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Fatura',
      required: true,
      index: true,
    },

    titulo: {
      type: String,
      required: true,
    },

    numeroParcela: {
      type: Number,
      required: true,
      min: 1,
    },

    totalParcelas: {
      type: Number,
      required: true,
      min: 1,
    },

    valor: {
      type: Number,
      required: true,
      min: 0,
    },

    valorPago: {
      type: Number,
      default: 0,
      min: 0,
    },

    dataCompra: {
      type: Date,
      required: true,
    },

    dataCobranca: {
      type: Date,
      required: true,
      index: true,
    },

    status: {
      type: String,
      enum: ['aberta', 'parcial', 'paga'],
      default: 'aberta',
      index: true,
    },
  },
  { timestamps: true }
);

ParcelaSchema.index({ transacao: 1, numeroParcela: 1 }, { unique: true });

module.exports = mongoose.model('Parcela', ParcelaSchema);
