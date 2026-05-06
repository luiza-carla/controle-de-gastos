const { addMonths } = require('date-fns');
const { criarDataSeguraNoMes } = require('../../utils/faturaHelpers');
const { paraCentavos, deCentavos } = require('../../utils/money');
const { obterTotalParcelas } = require('./limiteHelpers');
const { STATUS_PARCELA } = require('./statusHelpers');

function ratearValorParcelado(valorTotal, totalParcelas) {
  const quantidade = Math.max(Number(totalParcelas) || 1, 1);
  const valorEmCentavos = paraCentavos(valorTotal);
  const base = Math.floor(valorEmCentavos / quantidade);
  const resto = valorEmCentavos % quantidade;

  return Array.from({ length: quantidade }, (_, index) => {
    const valorParcela = base + (index < resto ? 1 : 0);
    return deCentavos(valorParcela);
  });
}

function adicionarMesesMantendoDia(dataBase, quantidadeMeses) {
  const base = new Date(dataBase);
  const novaData = addMonths(base, quantidadeMeses);
  return criarDataSeguraNoMes(
    novaData.getFullYear(),
    novaData.getMonth(),
    base.getDate()
  );
}

function obterDadosBaseParcelas(transacao) {
  return new Date(
    transacao.dataPrimeiraParcela ||
      transacao.data ||
      transacao.createdAt ||
      new Date()
  );
}

function construirParcelasDaTransacao(transacao) {
  const totalParcelas = obterTotalParcelas(transacao);
  const valoresParcelas = ratearValorParcelado(transacao.valor, totalParcelas);
  const dataBase = obterDadosBaseParcelas(transacao);

  return valoresParcelas.map((valorParcela, index) => ({
    usuario: transacao.usuario,
    transacao: transacao._id,
    conta: transacao.conta,
    titulo: transacao.titulo,
    numeroParcela: index + 1,
    totalParcelas,
    valor: valorParcela,
    valorPago: 0,
    dataCompra: dataBase,
    dataCobranca: adicionarMesesMantendoDia(dataBase, index),
    status: STATUS_PARCELA.ABERTA,
  }));
}

module.exports = {
  construirParcelasDaTransacao,
  ratearValorParcelado,
  adicionarMesesMantendoDia,
  obterDadosBaseParcelas,
};
