function normalizarInicioDoDia(data) {
  const value = new Date(data);
  value.setHours(0, 0, 0, 0);
  return value;
}

function normalizarFimDoDia(data) {
  const value = new Date(data);
  value.setHours(23, 59, 59, 999);
  return value;
}

function criarDataSeguraNoMes(ano, mes, dia) {
  const ultimoDiaDoMes = new Date(ano, mes + 1, 0).getDate();
  const diaSeguro = Math.min(Math.max(Number(dia) || 1, 1), ultimoDiaDoMes);
  return new Date(ano, mes, diaSeguro);
}

function obterFechamentoParaCompra(dataCompra, diaFechamento) {
  const compra = new Date(dataCompra || new Date());
  let ano = compra.getFullYear();
  let mes = compra.getMonth();

  if (compra.getDate() > Number(diaFechamento || 1)) {
    mes += 1;
    if (mes > 11) {
      mes = 0;
      ano += 1;
    }
  }

  return normalizarInicioDoDia(criarDataSeguraNoMes(ano, mes, diaFechamento));
}

function obterFechamentoAnterior(dataFechamento, diaFechamento) {
  const fechamento = new Date(dataFechamento);
  let ano = fechamento.getFullYear();
  let mes = fechamento.getMonth() - 1;

  if (mes < 0) {
    mes = 11;
    ano -= 1;
  }

  return normalizarInicioDoDia(criarDataSeguraNoMes(ano, mes, diaFechamento));
}

function obterVencimentoParaFechamento(
  dataFechamento,
  diaFechamento,
  diaVencimento
) {
  const fechamento = new Date(dataFechamento);
  let ano = fechamento.getFullYear();
  let mes = fechamento.getMonth();

  if (Number(diaVencimento || 1) <= Number(diaFechamento || 1)) {
    mes += 1;
    if (mes > 11) {
      mes = 0;
      ano += 1;
    }
  }

  return normalizarInicioDoDia(criarDataSeguraNoMes(ano, mes, diaVencimento));
}

function obterPeriodoFatura(dataCompra, diaFechamento, diaVencimento) {
  const dataFechamento = obterFechamentoParaCompra(dataCompra, diaFechamento);
  const fechamentoAnterior = obterFechamentoAnterior(
    dataFechamento,
    diaFechamento
  );
  const periodoInicio = normalizarInicioDoDia(fechamentoAnterior);
  periodoInicio.setDate(periodoInicio.getDate() + 1);

  return {
    periodoInicio,
    periodoFim: normalizarFimDoDia(dataFechamento),
    dataFechamento,
    dataVencimento: obterVencimentoParaFechamento(
      dataFechamento,
      diaFechamento,
      diaVencimento
    ),
  };
}

function obterFechamentoDoMes(dataReferencia, diaFechamento) {
  const data = new Date(dataReferencia || new Date());
  return normalizarInicioDoDia(
    criarDataSeguraNoMes(data.getFullYear(), data.getMonth(), diaFechamento)
  );
}

function jaPassouDaData(dataReferencia, dataLimite) {
  return (
    normalizarInicioDoDia(dataReferencia) > normalizarInicioDoDia(dataLimite)
  );
}

module.exports = {
  normalizarInicioDoDia,
  normalizarFimDoDia,
  criarDataSeguraNoMes,
  obterFechamentoParaCompra,
  obterFechamentoAnterior,
  obterVencimentoParaFechamento,
  obterPeriodoFatura,
  obterFechamentoDoMes,
  jaPassouDaData,
};
