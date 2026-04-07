const mongoose = require('mongoose');

const FaturaSchema = new mongoose.Schema(
  {
    usuario: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Usuario',
      required: true,
      index: true,
    },
    conta: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conta',
      required: true,
      index: true,
    },
    periodoInicio: {
      type: Date,
      required: true,
    },
    periodoFim: {
      type: Date,
      required: true,
    },
    dataFechamento: {
      type: Date,
      required: true,
    },
    dataVencimento: {
      type: Date,
      required: true,
    },
    valorTotal: {
      type: Number,
      default: 0,
      min: 0,
    },
    valorPago: {
      type: Number,
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      enum: ['aberta', 'fechada', 'paga', 'atrasada'],
      default: 'aberta',
      index: true,
    },
    dataFechamentoReal: {
      type: Date,
      default: null,
    },
    dataPagamentoTotal: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

FaturaSchema.index(
  { usuario: 1, conta: 1, periodoInicio: 1, periodoFim: 1 },
  { unique: true }
);

module.exports = mongoose.model('Fatura', FaturaSchema);
