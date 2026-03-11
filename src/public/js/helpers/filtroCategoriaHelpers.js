// Helper genérico para filtrar itens por categoria
import { setupCategoriaAutocomplete } from './categoriaHelpers.js';
import { warn } from './logger.js';
import { apiFetch } from '../config.js';
export function filtrarPorCategoria(lista, categoriaId) {
  if (!categoriaId) return lista;
  return lista.filter((item) => {
    if (!item?.categoria) return false;
    const id =
      typeof item.categoria === 'string' ? item.categoria : item.categoria._id;
    return id === categoriaId;
  });
}

// Helper para inicializar filtro de categoria com autocomplete
export async function inicializarFiltroCategoriaGenerico({
  inputBuscaId,
  inputHiddenId,
  dropdownId,
  btnLimparId,
  urlCategorias,
  stateObj,
  aplicarFiltroFn,
  limparFiltroFn,
}) {
  if (stateObj.filtroInicializado) return;

  const inputBusca = document.getElementById(inputBuscaId);
  const inputHidden = document.getElementById(inputHiddenId);
  const dropdown = document.getElementById(dropdownId);

  if (!inputBusca || !inputHidden || !dropdown) return;

  // use API wrapper para incluir token e lidar com 401
  let categorias;
  try {
    categorias = await apiFetch(urlCategorias);
  } catch (e) {
    // já tratado por apiFetch (possível 401 redirecionado) ou aqui
    warn(`Falha ao obter categorias: ${e.message}`, 'filtroCategoriaHelpers');
    return;
  }

  stateObj.categoriaAutocompleteFiltro = setupCategoriaAutocomplete(
    inputBuscaId,
    inputHiddenId,
    dropdownId,
    categorias,
    aplicarFiltroFn
  );

  document
    .getElementById(btnLimparId)
    ?.addEventListener('click', limparFiltroFn);

  stateObj.filtroInicializado = true;
}

// Helper para aplicar filtro de categoria
export function aplicarFiltroCategoriaGenerico(
  stateObj,
  inputHiddenId,
  renderFn,
  paginacaoObj
) {
  stateObj.filtroCategoriaId =
    document.getElementById(inputHiddenId)?.value || '';
  paginacaoObj.resetar();
  renderFn();
}

// Helper para limpar filtro de categoria
export function limparFiltroCategoriaGenerico(
  stateObj,
  paginacaoObj,
  renderFn
) {
  stateObj.categoriaAutocompleteFiltro?.limpar?.();
  stateObj.filtroCategoriaId = '';
  paginacaoObj.resetar();
  renderFn();
}
