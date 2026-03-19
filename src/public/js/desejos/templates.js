import { formatarValor, escaparHtml } from '../helpers/index.js';

export function buildEditarDesejoHTML(desejo) {
  const tipoDespesa = desejo.tipoDespesa || '';
  return `
    <div class="form-group">
      <label>Título</label>
      <input type="text" id="modalTituloDesejo" value="${escaparHtml(
        desejo.titulo
      )}" required>
    </div>
    <div class="form-group">
      <label>Valor</label>
      <input type="text" inputmode="decimal" data-moeda id="modalValorDesejo" value="${formatarValor(
        desejo.valor
      )}" required>
    </div>
    <div class="form-group">
      <label>Categoria</label>
      <div class="categoria-autocomplete">
        <input type="text" id="modalBuscaCategoriaDesejo" placeholder="Buscar categoria..." autocomplete="off" required>
        <input type="hidden" id="modalCategoriaDesejo" required>
        <div id="modalDropdownCategoriaDesejo" class="dropdown-categorias"></div>
      </div>
    </div>
    <div class="form-group" id="modalSubcategoriaGroupDesejo" style="display: none">
      <label>Subcategoria (opcional)</label>
      <div class="categoria-autocomplete">
        <input type="text" id="modalBuscaSubcategoriaDesejo" placeholder="Buscar subcategoria..." autocomplete="off">
        <input type="hidden" id="modalSubcategoriaDesejo">
        <div id="modalDropdownSubcategoriaDesejo" class="dropdown-categorias"></div>
      </div>
    </div>
    <div class="form-group">
      <label>Tipo de Despesa</label>
      <select id="modalTipoDespesa">
        <option value="">Selecione o tipo de despesa</option>
        <option value="essencial" ${tipoDespesa === 'essencial' ? 'selected' : ''}>Essencial</option>
        <option value="eventual" ${tipoDespesa === 'eventual' ? 'selected' : ''}>Eventual</option>
        <option value="opcional" ${tipoDespesa === 'opcional' ? 'selected' : ''}>Opcional</option>
      </select>
    </div>
    <div class="form-group">
      <label>Tags</label>
      <div id="modalTagsContainerDesejo" class="tag-editor-container"></div>
      <div class="tag-editor-input-row">
        <input type="text" id="modalTagInputDesejo" class="tag-editor-input" placeholder="Adicionar tag">
        <button type="button" id="modalBtnAddTagDesejo" class="btn btn-tag-add">
          <i class="fa-solid fa-plus"></i>
        </button>
      </div>
    </div>
  `;
}

export function buildRealizarDesejoHTML(desejo, contas, carteiraLabel) {
  const tipoDespesa = desejo.tipoDespesa || '';
  const opcoesConta = (contas || [])
    .map((c) => `<option value="${c._id}">${escaparHtml(c.nome)}</option>`)
    .join('');

  return `
    <p style="margin-bottom: 16px; color: var(--text-secondary);">
      Transformar <strong>${escaparHtml(desejo.titulo)}</strong> em uma transacao real.
    </p>
    <div class="form-group">
      <label>Conta ou carteira</label>
      <select id="modalContaDesejo" required>
        <option value="" selected disabled>Selecione a origem</option>
        <option value="carteira">${carteiraLabel}</option>
        ${opcoesConta}
      </select>
    </div>
    <div class="form-group">
      <label>Valor</label>
      <input type="text" inputmode="decimal" data-moeda id="modalValorTransacao" value="${formatarValor(
        desejo.valor
      )}">
    </div>
    <div class="form-group">
      <label>Tipo de despesa</label>
      <select id="modalTipoDespesa">
        <option value="" ${tipoDespesa === '' ? 'selected' : ''}>Selecione o tipo de despesa</option>
        <option value="essencial" ${tipoDespesa === 'essencial' ? 'selected' : ''}>Essencial</option>
        <option value="eventual" ${tipoDespesa === 'eventual' ? 'selected' : ''}>Eventual</option>
        <option value="opcional" ${tipoDespesa === 'opcional' ? 'selected' : ''}>Opcional</option>
      </select>
    </div>
    <div class="form-group">
      <label>Status do pagamento</label>
      <select id="modalStatusTransacao">
        <option value="" selected disabled>Selecione o status</option>
        <option value="pago">Pago</option>
        <option value="pendente">Pendente</option>
      </select>
    </div>
    <div class="form-group">
      <label>Data</label>
      <input type="date" id="modalDataTransacao" value="${
        new Date().toISOString().split('T')[0]
      }">
    </div>
  `;
}
