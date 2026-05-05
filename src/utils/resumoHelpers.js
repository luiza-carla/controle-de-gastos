const { obterInicioMes } = require('./../utils/salarioHelpers');

// Função auxiliar para somar um campo numérico de um array
function somarCampo(lista = [], campo) {
  return lista.reduce((acc, item) => acc + Number(item[campo] || 0), 0);
}

// Calcula totais de entradas e saídas de uma lista de transações
function totaisTransacoes(transacoes = []) {
  let entradas = 0;
  let saidas = 0;
  transacoes.forEach((t) => {
    if (t.tipo === 'entrada') entradas += Number(t.valor);
    if (t.tipo === 'saida') saidas += Number(t.valor);
  });
  return { entradas, saidas };
}

// Calcula soma total de saídas
function somaSaidas(transacoes = []) {
  return totaisTransacoes(transacoes).saidas;
}

function normalizarPeriodo(periodo = null) {
  const hoje = new Date();

  const inicio = periodo?.dataInicio;
  const fim = periodo?.dataFim;

  const dataInicio = inicio ? new Date(inicio) : null;
  const dataFim = fim ? new Date(fim) : null;

  const inicioValido =
    dataInicio instanceof Date && !isNaN(dataInicio.getTime());
  const fimValido = dataFim instanceof Date && !isNaN(dataFim.getTime());

  if (inicioValido && fimValido) {
    return {
      filtroAtivo: true,
      dataInicio: new Date(dataInicio.getTime()),
      dataFim: new Date(dataFim.getTime()),
    };
  }

  const inicioPadrao = obterInicioMes(hoje);

  return {
    filtroAtivo: false,
    dataInicio: new Date(inicioPadrao),
    dataFim: hoje,
  };
}

module.exports = {
  somarCampo,
  totaisTransacoes,
  somaSaidas,
  normalizarPeriodo,
};
