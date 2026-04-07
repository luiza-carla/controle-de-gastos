import { escaparHtml } from '../helpers/index.js';
import {
  formatarValor,
  formatarItemComTipo,
  contaEhCredito,
} from '../helpers/index.js';

const VALOR_CARTEIRA = 'carteira';

function templateSaldoConta(conta) {
  if (!contaEhCredito(conta)) {
    return `<div class="conta-saldo">R$ ${formatarValor(conta.saldo)}</div>`;
  }

  const limite = Number(conta.limite || 0);
  const limiteDisponivel = Number(conta.limiteDisponivel ?? limite);
  const valorEmFatura = Math.max(limite - limiteDisponivel, 0);

  return `
    <div class="conta-saldo">Fatura atual: R$ ${formatarValor(valorEmFatura)}</div>
    <div class="conta-meta">Limite: R$ ${formatarValor(limite)}</div>
    <div class="conta-meta">Disponível: R$ ${formatarValor(limiteDisponivel)}</div>
  `;
}

export function templateContaCard(conta) {
  const transferirButton = contaEhCredito(conta)
    ? ''
    : `
        <button class="btn btn-muted" data-conta-action="transferir" title="Transferir">
          <i class="fa-solid fa-exchange"></i>
        </button>
      `;

  return `
    <div class="conta-card" data-conta-id="${conta._id}">
      <div class="conta-nome">${escaparHtml(conta.nome)}</div>
      <div class="conta-tipo">Tipo: ${formatarItemComTipo(conta)}</div>
      ${templateSaldoConta(conta)}
      <div class="conta-acoes">
        <button class="btn btn-secondary" data-conta-action="editar" title="Editar">
          <i class="fa-solid fa-pen"></i>
        </button>
        ${transferirButton}
        <button class="btn btn-danger" data-conta-action="deletar" title="Deletar">
          <i class="fa-solid fa-trash"></i>
        </button>
      </div>
    </div>
  `;
}

export function templateSelectConta(contas, selectId) {
  const placeholderTexto =
    selectId === 'conta' || selectId === 'contaSalario'
      ? 'Selecione a conta ou carteira'
      : 'Selecione a conta';

  const placeholderAttrs =
    selectId === 'contaSalario' ? 'selected' : 'selected disabled';

  const options = contas
    .map(
      (c) =>
        `<option value="${c._id}" data-tipo="${escaparHtml(c.tipo)}">${formatarItemComTipo(c)}</option>`
    )
    .join('');

  const carteiraOption =
    selectId === 'conta' || selectId === 'contaSalario'
      ? `<option value="${VALOR_CARTEIRA}">Carteira (dinheiro físico)</option>`
      : '';

  return `
    <option value="" ${placeholderAttrs}>${placeholderTexto}</option>
    ${carteiraOption}
    ${options}
  `;
}

export function templateEditarConta(conta) {
  return `
    <div class="form-group">
      <label>Nome</label>
      <input type="text" id="modalNomeConta" value="${escaparHtml(
        conta.nome
      )}" required>
    </div>
  `;
}

export function templateTransferirConta(
  contaOrigem,
  optionsHtml,
  saldoFormatado
) {
  return `
    <div class="form-group">
      <label>De</label>
      <input type="text" value="${escaparHtml(contaOrigem.nome)}" disabled>
    </div>
    <div class="form-group">
      <label>Para</label>
      <select id="modalContaDestino" required>
        <option value="" selected disabled>Selecione o destino</option>
        ${optionsHtml}
      </select>
    </div>
    <div class="form-group">
      <label>Valor</label>
      <input type="text" inputmode="decimal" data-moeda id="modalValorTransferenciaConta" min="0" required>
    </div>
    <div class="form-group">
      <small class="text-secondary">Saldo disponível: R$ ${saldoFormatado}</small>
    </div>
  `;
}
