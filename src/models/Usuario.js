const mongoose = require('mongoose');

const UsuarioSchema = new mongoose.Schema(
  {
    nome: {
      type: String,
      required: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
    },

    senha: {
      type: String,
      required: true,
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
