import {
  clearElement,
  criarBotoesAcao,
  escaparHtml,
  formatarValor,
  formatarData,
  capitalizar,
  criarBadgesCategoriaSubcategoriaSeparados,
  gerarTags,
  setTextById,
  getCategoryThemeClass,
} from '../helpers/index.js';

const ACTIONS = {
  editar: 'editar',
  deletar: 'deletar',
  realizar: 'realizar',
};

export function buildDesejoCard(desejo) {
  const card = document.createElement('div');
  card.className = `transacao-card transacao-saida ${getCategoryThemeClass(
    desejo.categoria?.cor,
    desejo.categoria?.nome
  )}`;

  const tipoDespesa = desejo.tipoDespesa ? capitalizar(desejo.tipoDespesa) : '';
  const valorFormatado = formatarValor(desejo.valor);
  const { categoriaBadge, subcategoriaBadge } =
    criarBadgesCategoriaSubcategoriaSeparados(
      desejo.categoria,
      desejo.subcategoria
    );
  const tagsHtml = gerarTags(desejo.tags);

  card.innerHTML = `
    <div class="transacao-header">
      <div class="transacao-titulo">${escaparHtml(desejo.titulo)}</div>
      <div class="transacao-valor transacao-saida">R$ ${valorFormatado}</div>
    </div>

    <div class="transacao-corpo">
      <div class="transacao-info-grid">
        <div class="info-linha">
          <span class="info-label">Categoria:</span>
          <span class="info-valor">${categoriaBadge}</span>
        </div>
        ${
          subcategoriaBadge
            ? `<div class="info-linha">
              <span class="info-label">Subcategoria:</span>
              <span class="info-valor">${subcategoriaBadge}</span>
            </div>`
            : ''
        }
        <div class="info-linha">
          <span class="info-label">Criado em:</span>
          <span class="info-valor">${formatarData(desejo.createdAt)}</span>
        </div>
        ${
          tipoDespesa
            ? `<div class="info-linha">
              <span class="info-label">Tipo de despesa:</span>
              <span class="info-valor">${tipoDespesa}</span>
            </div>`
            : ''
        }
      </div>
      ${tagsHtml ? `<div class="transacao-tags">${tagsHtml}</div>` : ''}
    </div>

    <div class="transacao-acoes">
      ${criarBotoesAcao([
        {
          classe: 'success',
          dataAttributes: {
            action: ACTIONS.realizar,
            id: desejo._id,
          },
          icone: 'fa-circle-check',
          title: 'Realizar compra',
          texto: 'Realizar',
        },
        {
          classe: 'secondary',
          dataAttributes: {
            action: ACTIONS.editar,
            id: desejo._id,
          },
          icone: 'fa-pen',
          title: 'Editar',
        },
        {
          classe: 'danger',
          dataAttributes: {
            action: ACTIONS.deletar,
            id: desejo._id,
          },
          icone: 'fa-trash',
          title: 'Deletar',
        },
      ])}
    </div>
  `;

  return card;
}

export function criarControladorListaDesejos({
  state,
  onAction,
  containerId = 'listaDesejos',
  totalId = 'totalDesejos',
} = {}) {
  let handlerAtual = null;

  function obterContainer() {
    return document.getElementById(containerId);
  }

  function removerHandlerAnterior(container) {
    if (container && handlerAtual) {
      container.removeEventListener('click', handlerAtual);
    }
  }

  function registrarHandler(container) {
    removerHandlerAnterior(container);

    handlerAtual = (event) => {
      const button = event.target.closest('button[data-action]');
      if (!button) return;

      const action = button.dataset.action;
      const id = button.dataset.id;
      if (!action || !id) return;

      onAction?.({ action, id });
    };

    container.addEventListener('click', handlerAtual);
  }

  function init() {
    const container = obterContainer();
    if (!container) return;

    registrarHandler(container);
  }

  function render() {
    const container = obterContainer();
    if (!container || !state) return;

    const itens = state.getPageItems();
    const total = state.getTotalItems();

    clearElement(container);
    itens.forEach((item) => {
      container.appendChild(buildDesejoCard(item));
    });

    state.pagination.setTotal(total);
    setTextById(totalId, `R$ ${formatarValor(state.getTotalValor())}`);
  }

  return {
    init,
    render,
  };
}

export function renderListaDesejos({ state, container, onAction }) {
  if (!container) return;

  const itens = state.getPageItems();
  const total = state.getTotalItems();

  clearElement(container);
  itens.forEach((item) => {
    container.appendChild(buildDesejoCard(item));
  });

  state.pagination.setTotal(total);

  const totalValor = state.getTotalValor();
  setTextById('totalDesejos', `R$ ${formatarValor(totalValor)}`);

  // Delegação de eventos para ações dos cards
  if (container._desejosHandler) {
    container.removeEventListener('click', container._desejosHandler);
  }

  const handler = (event) => {
    const button = event.target.closest('button[data-action]');
    if (!button) return;

    const action = button.dataset.action;
    const id = button.dataset.id;
    if (!action || !id) return;

    onAction?.({ action, id });
  };

  container.addEventListener('click', handler);
  container._desejosHandler = handler;
}
