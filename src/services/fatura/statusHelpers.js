const { jaPassouDaData } = require('../../utils/faturaHelpers');
const { obterNumeroSeguro } = require('../../utils/money');

const STATUS_FATURA = {
  ABERTA: 'aberta',
  FECHADA: 'fechada',
  PAGA: 'paga',
  ATRASADA: 'atrasada',
};

const STATUS_PARCELA = {
  ABERTA: 'aberta',
  PARCIAL: 'parcial',
  PAGA: 'paga',
};

function atualizarStatusFatura(fatura, dataReferencia = new Date()) {
  if (!fatura) {
    return null;
  }

  const valorTotal = obterNumeroSeguro(fatura.valorTotal);
  const valorPago = obterNumeroSeguro(fatura.valorPago);

  if (valorTotal > 0 && valorPago >= valorTotal) {
    fatura.status = STATUS_FATURA.PAGA;
    if (!fatura.dataPagamentoTotal) {
      fatura.dataPagamentoTotal = new Date(dataReferencia);
    }
    return fatura;
  }

  fatura.dataPagamentoTotal = null;

  if (
    valorTotal > valorPago &&
    jaPassouDaData(dataReferencia, fatura.dataVencimento)
  ) {
    fatura.status = STATUS_FATURA.ATRASADA;
    return fatura;
  }

  if (fatura.dataFechamentoReal) {
    fatura.status = STATUS_FATURA.FECHADA;
    return fatura;
  }

  fatura.status = STATUS_FATURA.ABERTA;
  return fatura;
}

function atualizarStatusParcela(parcela) {
  const valor = obterNumeroSeguro(parcela.valor);
  const valorPago = Math.min(obterNumeroSeguro(parcela.valorPago), valor);
  parcela.valorPago = valorPago;

  if (valorPago >= valor && valor > 0) {
    parcela.status = STATUS_PARCELA.PAGA;
    return parcela;
  }

  if (valorPago > 0) {
    parcela.status = STATUS_PARCELA.PARCIAL;
    return parcela;
  }

  parcela.status = STATUS_PARCELA.ABERTA;
  return parcela;
}

module.exports = {
  STATUS_FATURA,
  STATUS_PARCELA,
  atualizarStatusFatura,
  atualizarStatusParcela,
};
