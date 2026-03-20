import {
  $,
  inicializarFiltroCategoriaGenerico,
  aplicarFiltroCategoriaGenerico,
  limparFiltroCategoriaGenerico,
  createFilterBadge,
} from '../helpers/index.js';

export async function initTransacaoFilters({
  state,
  renderFn,
  listarFn,
  paginacao,
}) {
  if (!state || !renderFn || !listarFn || !paginacao) return;

  const badge = createFilterBadge({
    buttonId: 'btnLimparFiltroCategoriaTransacao',
    getCount: () =>
      [
        state.filtroCategoriaId,
        state.filtroTexto,
        state.filtroTipo,
        state.filtroStatus,
      ].filter(Boolean).length,
  });

  syncTransacaoStateFromDOM(state);

  await initFiltroCategoria({ state, renderFn, paginacao, badge });
  initFiltroTipo({ state, renderFn, paginacao, badge });
  initFiltroStatus({ state, renderFn, paginacao, badge });
  initOrdenacaoTransacoes({ state, listarFn, paginacao });
}

function syncTransacaoStateFromDOM(state) {
  const filtroTexto = $('filtroBuscaNomeTransacao');
  const filtroTipo = $('filtroTipoTransacao');
  const filtroStatus = $('filtroStatusTransacao');
  const filtroCategoria = $('filtroCategoriaTransacao');

  if (filtroTexto) state.filtroTexto = filtroTexto.value || '';
  if (filtroTipo) state.filtroTipo = filtroTipo.value || '';
  if (filtroStatus) state.filtroStatus = filtroStatus.value || '';
  if (filtroCategoria) state.filtroCategoriaId = filtroCategoria.value || '';
}

async function initFiltroCategoria({ state, renderFn, paginacao, badge }) {
  const btnLimpar = $('btnLimparFiltroCategoriaTransacao');

  btnLimpar?.addEventListener('click', () => {
    state.filtroTexto = '';
    state.filtroTipo = '';
    state.filtroStatus = '';

    const filtroNome = $('filtroBuscaNomeTransacao');
    if (filtroNome) filtroNome.value = '';

    const filtroTipo = $('filtroTipoTransacao');
    if (filtroTipo) filtroTipo.value = '';

    const filtroStatus = $('filtroStatusTransacao');
    if (filtroStatus) filtroStatus.value = '';

    limparFiltroCategoriaGenerico(state, paginacao, renderFn);
    badge.update();
  });

  if (state.filtroInicializado) return;

  const inputBusca = $('filtroBuscaCategoriaTransacao');
  const inputHidden = $('filtroCategoriaTransacao');
  const dropdown = $('filtroDropdownCategoriaTransacao');
  const inputTexto = $('filtroBuscaNomeTransacao');

  if (!inputBusca || !inputHidden || !dropdown || !inputTexto) return;

  inicializarFiltroCategoriaGenerico({
    inputBuscaId: 'filtroBuscaCategoriaTransacao',
    inputHiddenId: 'filtroCategoriaTransacao',
    dropdownId: 'filtroDropdownCategoriaTransacao',
    btnLimparId: 'btnLimparFiltroCategoriaTransacao',
    urlCategorias: `${window.location.origin}/categorias`,
    stateObj: state,
    aplicarFiltroFn: () => {
      aplicarFiltroCategoriaGenerico(
        state,
        'filtroCategoriaTransacao',
        renderFn,
        paginacao
      );
      badge.update();
    },
    limparFiltroFn: () => {
      state.filtroTexto = '';
      const filtroNome = $('filtroBuscaNomeTransacao');
      if (filtroNome) filtroNome.value = '';
      limparFiltroCategoriaGenerico(state, paginacao, renderFn);
      badge.update();
    },
  });

  inputTexto.addEventListener('input', () => {
    state.filtroTexto = inputTexto.value;
    paginacao.resetar();
    renderFn();
    badge.update();
  });

  state.filtroInicializado = true;
  badge.update();
}

function initFiltroTipo({ state, renderFn, paginacao, badge }) {
  const selectTipo = $('filtroTipoTransacao');
  if (!selectTipo) return;

  if (state.filtroTipo) {
    selectTipo.value = state.filtroTipo;
  } else {
    state.filtroTipo = selectTipo.value || '';
  }

  selectTipo.addEventListener('change', () => {
    state.filtroTipo = selectTipo.value;
    paginacao.resetar();
    renderFn();
    badge.update();
  });
}

function initFiltroStatus({ state, renderFn, paginacao, badge }) {
  const selectStatus = $('filtroStatusTransacao');
  if (!selectStatus) return;

  if (state.filtroStatus) {
    selectStatus.value = state.filtroStatus;
  } else {
    state.filtroStatus = selectStatus.value || '';
  }

  selectStatus.addEventListener('change', () => {
    state.filtroStatus = selectStatus.value;
    paginacao.resetar();
    renderFn();
    badge.update();
  });
}

function initOrdenacaoTransacoes({ state, listarFn, paginacao }) {
  if (state.ordenacaoInicializada) return;

  const selectOrdenacao = $('filtroOrdenarTransacoes');
  if (!selectOrdenacao) return;

  selectOrdenacao.value = state.ordenarPor;
  selectOrdenacao.addEventListener('change', async () => {
    state.ordenarPor = selectOrdenacao.value;
    paginacao.resetar();
    await listarFn();
  });

  state.ordenacaoInicializada = true;
}
