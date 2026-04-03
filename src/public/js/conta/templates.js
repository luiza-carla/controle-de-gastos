import { escaparHtml } from '../helpers/index.js';
import { formatarValor, formatarItemComTipo } from '../helpers/index.js';

const VALOR_CARTEIRA = 'carteira';

export function templateContaCard(conta) {
  return `
    <div class="conta-card" data-conta-id="${conta._id}">
      <div class="conta-nome">${escaparHtml(conta.nome)}</div>
      <div class="conta-tipo">Tipo: ${formatarItemComTipo(conta)}</div>
      <div class="conta-saldo">R$ ${formatarValor(conta.saldo)}</div>
      <div class="conta-acoes">
        <button class="btn btn-secondary" data-conta-action="editar" title="Editar">
          <i class="fa-solid fa-pen"></i>
        </button>
        <button class="btn btn-muted" data-conta-action="transferir" title="Transferir">
          <i class="fa-solid fa-exchange"></i>
        </button>
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
    .map((c) => `<option value="${c._id}">${formatarItemComTipo(c)}</option>`)
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
    <div class="form-group">
      <label>Tipo</label>
      <select id="modalTipoConta" required>
        <option value="corrente" ${
          conta.tipo === 'corrente' ? 'selected' : ''
        }>Corrente</option>
        <option value="credito" ${
          conta.tipo === 'credito' ? 'selected' : ''
        }>Crédito</option>
        <option value="investimento" ${
          conta.tipo === 'investimento' ? 'selected' : ''
        }>Investimento</option>
      </select>
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
