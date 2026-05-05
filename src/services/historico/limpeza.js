const Historico = require('../../models/Historico');
const Usuario = require('../../models/Usuario');
const mongoose = require('mongoose');
const logger = require('../../utils/logger');
const { criarErro } = require('../../utils/errorHelpers');

// Limpa histórico a cada X dias desde a última limpeza (ou criação da conta).
async function calcularDiasRestantesParaLimpeza(diasCiclo = 30) {
  const agora = new Date();

  const usuarios = await Usuario.find(
    {},
    {
      createdAt: 1,
      ultimaLimpezaHistorico: 1,
      primeiraLimpezaHistorico: 1,
    }
  ).lean();

  if (!usuarios.length) {
    return { countElegiveis: 0, minDiasRestantes: null };
  }

  let countElegiveis = 0;
  let minDiasRestantes = Infinity;

  const msPorDia = 1000 * 60 * 60 * 24;

  for (const usuario of usuarios) {
    let referencia;
    if (usuario.primeiraLimpezaHistorico !== false) {
      // Primeiro ciclo: referência é a criação da conta.
      referencia = usuario.createdAt;
    } else {
      // Limpeza subsequente: referência é a última limpeza.
      referencia = usuario.ultimaLimpezaHistorico;
    }

    if (!referencia) continue;

    const diasPassados = Math.floor((agora - new Date(referencia)) / msPorDia);
    const diasRestantes = diasCiclo - diasPassados;

    if (diasRestantes <= 0) {
      countElegiveis += 1;
    } else {
      minDiasRestantes = Math.min(minDiasRestantes, diasRestantes);
    }
  }

  return {
    countElegiveis,
    minDiasRestantes: minDiasRestantes === Infinity ? null : minDiasRestantes,
  };
}

async function limparPorCiclo(diasCiclo = 30) {
  if (diasCiclo <= 0) {
    throw criarErro(400, 'Dias de ciclo deve ser um número positivo');
  }

  const hoje = new Date();
  const dataLimiteCiclo = new Date();
  dataLimiteCiclo.setDate(dataLimiteCiclo.getDate() - diasCiclo);

  // Busca usuários que precisam de limpeza:
  // - primeiraLimpezaHistorico (ou ausente) e conta com mais de X dias, OU
  // - limpeza normal (primeiraLimpezaHistorico false) e passou X dias desde a última limpeza.
  const usuariosPrimeira = await Usuario.find(
    {
      primeiraLimpezaHistorico: mongoose.trusted({ $ne: false }),
      createdAt: mongoose.trusted({ $lte: dataLimiteCiclo }),
    },
    { _id: 1 },
    { sanitizeFilter: false }
  ).lean();

  const usuariosCiclo = await Usuario.find(
    {
      primeiraLimpezaHistorico: false,
      ultimaLimpezaHistorico: mongoose.trusted({ $lte: dataLimiteCiclo }),
    },
    { _id: 1 },
    { sanitizeFilter: false }
  ).lean();

  const usuariosPrimeiraLimpezaIds = usuariosPrimeira.map((u) => u._id);
  const usuariosCicloIds = usuariosCiclo.map((u) => u._id);

  if (!usuariosPrimeiraLimpezaIds.length && !usuariosCicloIds.length) {
    return 0;
  }

  let totalRemovidos = 0;

  // Para a primeira limpeza do usuário: remove TODO o histórico dele.
  if (usuariosPrimeiraLimpezaIds.length) {
    const resultado = await Historico.deleteMany(
      { usuario: mongoose.trusted({ $in: usuariosPrimeiraLimpezaIds }) },
      { sanitizeFilter: false }
    );
    totalRemovidos += resultado.deletedCount;

    await Usuario.updateMany(
      { _id: mongoose.trusted({ $in: usuariosPrimeiraLimpezaIds }) },
      {
        $set: {
          primeiraLimpezaHistorico: false,
          ultimaLimpezaHistorico: hoje,
        },
      },
      { sanitizeFilter: false }
    );
  }

  // Para limpezas de ciclo subsequentes: remove todo o histórico do usuário.
  if (usuariosCicloIds.length) {
    const resultado = await Historico.deleteMany(
      {
        usuario: mongoose.trusted({ $in: usuariosCicloIds }),
      },
      {
        sanitizeFilter: false,
      }
    );
    totalRemovidos += resultado.deletedCount;

    await Usuario.updateMany(
      { _id: mongoose.trusted({ $in: usuariosCicloIds }) },
      { $set: { ultimaLimpezaHistorico: hoje } },
      { sanitizeFilter: false }
    );
  }

  const totalUsuarios =
    usuariosPrimeiraLimpezaIds.length + usuariosCicloIds.length;
  logger.info(
    `Limpeza concluida: ${totalRemovidos} registro(s) removido(s) em ${totalUsuarios} usuário(s) (primeira: ${usuariosPrimeiraLimpezaIds.length}, ciclo: ${usuariosCicloIds.length})`,
    'HistoricoCleanup'
  );

  return totalRemovidos;
}

module.exports = {
  calcularDiasRestantesParaLimpeza,
  limparPorCiclo,
};
