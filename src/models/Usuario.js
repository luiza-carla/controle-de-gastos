const mongoose = require('mongoose');

const UsuarioSchema = new mongoose.Schema(
  {
    nome: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 80,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      maxlength: 160,
      match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    },

    senha: {
      type: String,
      required: true,
    },

    ativa: {
      type: Boolean,
      default: true,
    },

    preferencias: {
      formatoData: {
        type: String,
        enum: ['DD/MM/AAAA', 'AAAA-MM-DD'],
        default: 'DD/MM/AAAA',
      },
    },

    ultimaLimpezaHistorico: {
      type: Date,
      default: null,
    },

    primeiraLimpezaHistorico: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Usuario', UsuarioSchema);
