const mongoose = require('mongoose');
const { obterInicioMes } = require('../../utils/salarioHelpers');

function obterPeriodoResumo(periodo = null) {
  if (periodo?.dataInicio && periodo?.dataFim) {
    return {
      filtroAtivo: true,
      dataInicio: periodo.dataInicio,
      dataFim: periodo.dataFim,
    };
  }

  const hoje = new Date();

  return {
    filtroAtivo: false,
    dataInicio: obterInicioMes(hoje),
    dataFim: hoje,
  };
}

function criarFiltroTransacoes(usuarioId, periodo, status = 'pago') {
  const dataInicio = new Date(periodo.dataInicio);
  const dataFim = new Date(periodo.dataFim);

  return {
    usuario: usuarioId,
    ativa: true,
    status,
    data: mongoose.trusted({
      $gte: dataInicio,
      $lte: dataFim,
    }),
  };
}

function formatarPeriodoResposta(periodo) {
  return {
    filtroAtivo: periodo.filtroAtivo,
    dataInicio: periodo.dataInicio,
    dataFim: periodo.dataFim,
  };
}

module.exports = {
  obterPeriodoResumo,
  criarFiltroTransacoes,
  formatarPeriodoResposta,
};
