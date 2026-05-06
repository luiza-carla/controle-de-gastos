const mongoose = require('mongoose');
const { normalizarDinheiro } = require('../utils/money');

const TransacaoSchema = new mongoose.Schema(
  {
    usuario: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Usuario',
      required: true,
    },

    conta: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conta',
      required: false,
    },

    fatura: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Fatura',
      required: false,
    },

    fonteSaldo: {
      type: String,
      enum: ['conta', 'carteira'],
      default: 'conta',
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

    tipo: {
      type: String,
      enum: ['entrada', 'saida'],
      required: true,
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
      validate: {
        validator: function (v) {
          if (v && this.tipo !== 'saida') return false;
          return true;
        },
        message:
          'tipoDespesa só pode ser definido para transações do tipo "saida".',
      },
    },

    data: {
      type: Date,
      default: Date.now,
    },

    ativa: {
      type: Boolean,
      default: true,
    },

    tags: [{ type: String }],

    recorrencia: {
      type: String,
      enum: ['nenhuma', 'mensal'],
      default: 'nenhuma',
    },

    frequencia: {
      type: String,
      enum: ['mensal' /* 'semanal', 'diario', 'anual', 'hora', 'outra' */],
      required: false,
    },

    diaRecebimento: {
      type: Number,
      min: 1,
      max: 31,
      required: false,
    },

    dataUltimoProcessamento: {
      type: Date,
      required: false,
    },

    parcelamento: {
      totalParcelas: { type: Number, default: 1 },
      parcelaAtual: { type: Number, default: 1 },
    },

    dataPrimeiraParcela: {
      type: Date,
      required: false,
    },

    status: {
      type: String,
      enum: ['pendente', 'pago'],
      default: 'pago',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Transacao', TransacaoSchema);
