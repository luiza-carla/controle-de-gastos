const mongoose = require('mongoose');

function normalizarObjectIdSnapshot(referencia) {
  if (!referencia) return null;

  if (typeof referencia === 'object') {
    referencia = referencia._id || referencia.id || referencia;
  }

  const valor = referencia.toString?.() ?? referencia;

  if (mongoose.Types.ObjectId.isValid(valor)) {
    return valor;
  }

  return typeof referencia === 'string' ? referencia : null;
}

function normalizarSnapshotTransacao(snapshot) {
  if (!snapshot || typeof snapshot !== 'object') {
    return snapshot;
  }

  return {
    ...snapshot,
    _id: normalizarObjectIdSnapshot(snapshot._id),
    usuario: normalizarObjectIdSnapshot(snapshot.usuario),
    conta: normalizarObjectIdSnapshot(snapshot.conta),
    categoria: normalizarObjectIdSnapshot(snapshot.categoria),
    subcategoria: normalizarObjectIdSnapshot(snapshot.subcategoria),
  };
}

module.exports = {
  normalizarSnapshotTransacao,
  normalizarObjectIdSnapshot,
};
