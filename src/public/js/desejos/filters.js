import {
  inicializarFiltroCategoriaGenerico,
  aplicarFiltroCategoriaGenerico,
  limparFiltroCategoriaGenerico,
  $,
} from '../helpers/index.js';

export function initFiltroCategoriaDesejo(state, renderFn) {
  const btnLimpar = $('btnLimparFiltroCategoriaDesejo');
  btnLimpar?.addEventListener('click', () => {
    state.filtroTexto = '';
    const filtroNome = $('filtroBuscaNomeDesejo');
    if (filtroNome) filtroNome.value = '';

    limparFiltroCategoriaGenerico(state, state.pagination, renderFn);
  });

  if (state.filtroInicializado) return;

  const inputBusca = $('filtroBuscaCategoriaDesejo');
  const inputHidden = $('filtroCategoriaDesejo');
  const dropdown = $('filtroDropdownCategoriaDesejo');
  const inputTexto = $('filtroBuscaNomeDesejo');

  if (!inputBusca || !inputHidden || !dropdown || !inputTexto) return;

  inicializarFiltroCategoriaGenerico({
    inputBuscaId: 'filtroBuscaCategoriaDesejo',
    inputHiddenId: 'filtroCategoriaDesejo',
    dropdownId: 'filtroDropdownCategoriaDesejo',
    btnLimparId: 'btnLimparFiltroCategoriaDesejo',
    urlCategorias: `${window.location.origin}/categorias`,
    stateObj: state,
    aplicarFiltroFn: () =>
      aplicarFiltroCategoriaGenerico(
        state,
        'filtroCategoriaDesejo',
        renderFn,
        state.pagination
      ),
    limparFiltroFn: () => {
      state.filtroTexto = '';
      const filtroNome = $('filtroBuscaNomeDesejo');
      if (filtroNome) filtroNome.value = '';
      limparFiltroCategoriaGenerico(state, state.pagination, renderFn);
    },
  });

  inputTexto.addEventListener('input', () => {
    state.filtroTexto = inputTexto.value;
    state.pagination.resetar();
    renderFn();
  });

  state.filtroInicializado = true;
}

export function initOrdenacaoDesejos(state, renderFn, listarFn) {
  if (state.ordenacaoInicializada) return;

  const selectOrdenacao = $('filtroOrdenarDesejos');
  if (!selectOrdenacao) return;

  selectOrdenacao.value = state.ordenarPor;
  selectOrdenacao.addEventListener('change', async () => {
    state.ordenarPor = selectOrdenacao.value;
    state.pagination.resetar();
    await listarFn();
  });

  state.ordenacaoInicializada = true;
}
