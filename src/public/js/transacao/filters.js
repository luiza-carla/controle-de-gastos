import {
  $,
  inicializarFiltroCategoriaGenerico,
  aplicarFiltroCategoriaGenerico,
  limparFiltroCategoriaGenerico,
} from '../helpers/index.js';

export function initTransacaoFilters({ state, renderFn, listarFn, paginacao }) {
  if (!state || !renderFn || !listarFn || !paginacao) return;

  initFiltroCategoria({ state, renderFn, paginacao });
  initOrdenacaoTransacoes({ state, listarFn, paginacao });
}

function initFiltroCategoria({ state, renderFn, paginacao }) {
  const btnLimpar = $('btnLimparFiltroCategoriaTransacao');
  btnLimpar?.addEventListener('click', () => {
    state.filtroTexto = '';
    const filtroNome = $('filtroBuscaNomeTransacao');
    if (filtroNome) filtroNome.value = '';

    limparFiltroCategoriaGenerico(state, paginacao, renderFn);
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
    aplicarFiltroFn: () =>
      aplicarFiltroCategoriaGenerico(
        state,
        'filtroCategoriaTransacao',
        renderFn,
        paginacao
      ),
    limparFiltroFn: () => {
      state.filtroTexto = '';
      const filtroNome = $('filtroBuscaNomeTransacao');
      if (filtroNome) filtroNome.value = '';
      limparFiltroCategoriaGenerico(state, paginacao, renderFn);
    },
  });

  inputTexto.addEventListener('input', () => {
    state.filtroTexto = inputTexto.value;
    paginacao.resetar();
    renderFn();
  });

  state.filtroInicializado = true;
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
