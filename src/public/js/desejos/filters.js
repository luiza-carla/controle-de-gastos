import {
  inicializarFiltroCategoriaGenerico,
  aplicarFiltroCategoriaGenerico,
  limparFiltroCategoriaGenerico,
  $,
  createFilterBadge,
} from '../helpers/index.js';

export async function initFiltroCategoriaDesejo(state, renderFn) {
  const badge = createFilterBadge({
    buttonId: 'btnLimparFiltroCategoriaDesejo',
    getCount: () =>
      [state.filtroTexto, state.filtroCategoriaId].filter(Boolean).length,
  });

  // Sincroniza com valores do DOM (caso o browser restaure o formulário)
  const filtroTexto = $('filtroBuscaNomeDesejo');
  const filtroCategoria = $('filtroCategoriaDesejo');
  if (filtroTexto) state.filtroTexto = filtroTexto.value || '';
  if (filtroCategoria) state.filtroCategoriaId = filtroCategoria.value || '';

  const btnLimpar = $('btnLimparFiltroCategoriaDesejo');
  btnLimpar?.addEventListener('click', () => {
    state.filtroTexto = '';
    const filtroNome = $('filtroBuscaNomeDesejo');
    if (filtroNome) filtroNome.value = '';

    limparFiltroCategoriaGenerico(state, state.pagination, renderFn);
    badge.update();
  });

  if (state.filtroInicializado) return;

  const inputBusca = $('filtroBuscaCategoriaDesejo');
  const inputHidden = $('filtroCategoriaDesejo');
  const dropdown = $('filtroDropdownCategoriaDesejo');
  const inputTexto = $('filtroBuscaNomeDesejo');

  if (!inputBusca || !inputHidden || !dropdown || !inputTexto) return;

  await inicializarFiltroCategoriaGenerico({
    inputBuscaId: 'filtroBuscaCategoriaDesejo',
    inputHiddenId: 'filtroCategoriaDesejo',
    dropdownId: 'filtroDropdownCategoriaDesejo',
    btnLimparId: 'btnLimparFiltroCategoriaDesejo',
    urlCategorias: `${window.location.origin}/categorias`,
    stateObj: state,
    aplicarFiltroFn: () => {
      aplicarFiltroCategoriaGenerico(
        state,
        'filtroCategoriaDesejo',
        renderFn,
        state.pagination
      );
      badge.update();
    },
    limparFiltroFn: () => {
      state.filtroTexto = '';
      const filtroNome = $('filtroBuscaNomeDesejo');
      if (filtroNome) filtroNome.value = '';
      limparFiltroCategoriaGenerico(state, state.pagination, renderFn);
      badge.update();
    },
  });

  badge.update();

  inputTexto.addEventListener('input', () => {
    state.filtroTexto = inputTexto.value;
    state.pagination.resetar();
    renderFn();
    badge.update();
  });

  state.filtroInicializado = true;
  badge.update();
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
