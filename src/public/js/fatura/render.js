import {
  $,
  setHTMLById,
  setTextById,
  formatarData,
  formatarValor,
  formatarMoeda,
  escaparHtml,
  showElement,
  hideElement,
} from '../helpers/index.js';

function formatarStatus(status = '') {
  const mapa = {
    aberta: 'Aberta',
    fechada: 'Fechada',
    paga: 'Paga',
    atrasada: 'Atrasada',
    parcial: 'Parcial',
  };

  return mapa[status] || status;
}

function calcularTotais(faturas = []) {
  return faturas.reduce(
    (acc, fatura) => {
      const total = Number(fatura.valorTotal || 0);
      const pago = Number(fatura.valorPago || 0);

      acc.totalPago += pago;
      acc.totalAberto += Math.max(total - pago, 0);
      return acc;
    },
    { totalAberto: 0, totalPago: 0 }
  );
}

function templateParcela(parcela) {
  const compraOriginal =
    parcela.transacao?.titulo || parcela.titulo || 'Compra';

  return `
    <div class="fatura-parcela-item">
      <div>
        <div class="fatura-parcela-titulo">${escaparHtml(compraOriginal)}</div>
        <div class="fatura-parcela-meta">
          Parcela ${parcela.numeroParcela}/${parcela.totalParcelas} • Cobrança em ${formatarData(
            parcela.dataCobranca
          )}
        </div>
      </div>
      <div class="fatura-parcela-valor">R$ ${formatarValor(parcela.valor)}</div>
      <div class="fatura-parcela-status">${formatarStatus(parcela.status)}</div>
    </div>
  `;
}

function templateFatura(fatura) {
  const contaNome = fatura.conta?.nome || 'Cartão';
  const valorEmAberto = Math.max(
    Number(fatura.valorTotal || 0) - Number(fatura.valorPago || 0),
    0
  );
  const parcelasHtml = (fatura.parcelas || []).map(templateParcela).join('');

  return `
    <section class="fatura-card">
      <div class="fatura-card-header">
        <div>
          <div class="fatura-card-titulo">
            <i class="fa-regular fa-credit-card"></i>
            <span>${escaparHtml(contaNome)}</span>
            <span class="fatura-badge ${escaparHtml(fatura.status)}">${formatarStatus(
              fatura.status
            )}</span>
          </div>
          <div class="fatura-card-subtitulo">
            Período: ${formatarData(fatura.periodoInicio)} até ${formatarData(
              fatura.periodoFim
            )} Vencimento: ${formatarData(fatura.dataVencimento)}
          </div>
        </div>

        <div class="fatura-card-metricas">
          <div class="fatura-card-metrica">
            <span class="fatura-card-metrica-label">Total da fatura</span>
            <div class="fatura-card-metrica-valor">${formatarMoeda(
              fatura.valorTotal
            )}</div>
          </div>
          <div class="fatura-card-metrica">
            <span class="fatura-card-metrica-label">Em aberto</span>
            <div class="fatura-card-metrica-valor">${formatarMoeda(
              valorEmAberto
            )}</div>
          </div>
        </div>
      </div>

      <div class="fatura-card-body">
        <div class="fatura-parcelas-titulo">Parcelas desta fatura</div>
        <div class="fatura-parcelas-lista">${parcelasHtml}</div>
      </div>
    </section>
  `;
}

export function renderFaturas(faturas = []) {
  const container = $('faturasContainer');
  const emptyState = $('faturasEmptyState');
  if (!container || !emptyState) {
    return;
  }

  const totais = calcularTotais(faturas);
  setTextById('faturasTotalAberto', formatarMoeda(totais.totalAberto));
  setTextById('faturasTotalPago', formatarMoeda(totais.totalPago));
  setTextById('faturasQuantidade', String(faturas.length));

  if (!faturas.length) {
    setHTMLById('faturasContainer', '');
    showElement(emptyState);
    return;
  }

  hideElement(emptyState);
  setHTMLById('faturasContainer', faturas.map(templateFatura).join(''));
}
