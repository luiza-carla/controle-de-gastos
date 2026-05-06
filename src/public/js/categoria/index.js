import {
  esconderSubcategoriaGroup,
  mostrarSubcategoriaGroup,
  limparAutocomplete,
  bindCategoriaInput,
} from './render.js';
import {
  setupCategoriaAutocomplete,
  setupSubcategoriaAutocomplete,
} from '../helpers/index.js';
import {
  carregarCategorias,
  carregarSubcategorias,
  getCategorias,
  setCategoriaAutocomplete,
  setSubcategoriaAutocomplete,
  getCategoriaAutocomplete,
  getSubcategoriaAutocomplete,
} from './service.js';

const DEFAULT_IDS = {
  inputCategoria: 'buscaCategoria',
  inputCategoriaHidden: 'categoria',
  dropdownCategoria: 'dropdownCategorias',
  inputSubcategoria: 'buscaSubcategoria',
  inputSubcategoriaHidden: 'subcategoria',
  dropdownSubcategoria: 'dropdownSubcategorias',
  subcategoriaGroup: 'subcategoriaGroup',
  formTransacao: 'formTransacao',
  formListaDesejo: 'formListaDesejo',
};

export async function inicializarCategorias(options = {}) {
  const ids = { ...DEFAULT_IDS, ...options };

  await carregarCategorias();

  const mostrarGrupo = (mostrar) => {
    if (mostrar) {
      mostrarSubcategoriaGroup(ids.subcategoriaGroup);
    } else {
      esconderSubcategoriaGroup(ids.subcategoriaGroup);
    }
  };

  const categoriaAutocomplete = setupCategoriaAutocomplete(
    ids.inputCategoria,
    ids.inputCategoriaHidden,
    ids.dropdownCategoria,
    getCategorias(),
    async (categoriaId, _categoriaNome, categoriaSlug) => {
      const subcategorias = await carregarSubcategorias(categoriaId);
      getSubcategoriaAutocomplete()?.atualizarOpcoes(
        subcategorias,
        categoriaSlug
      );
      mostrarGrupo(subcategorias && subcategorias.length > 0);
    }
  );

  const subcategoriaAutocomplete = setupSubcategoriaAutocomplete(
    ids.inputSubcategoria,
    ids.inputSubcategoriaHidden,
    ids.dropdownSubcategoria,
    []
  );

  setCategoriaAutocomplete(categoriaAutocomplete);
  setSubcategoriaAutocomplete(subcategoriaAutocomplete);

  ['formTransacao', 'formListaDesejo'].forEach((formId) => {
    const form = document.getElementById(ids[formId]);
    form?.addEventListener('reset', () => {
      limparCategoriaSelecionada();
      limparSubcategoriaSelecionada();
      mostrarGrupo(false);
    });
  });

  bindCategoriaInput(
    ids.inputCategoria,
    (value) => filtrarCategorias(value),
    (value) => {
      if (!value.trim()) {
        mostrarGrupo(false);
        limparSubcategoriaSelecionada();
      }
    }
  );
}

export async function listarCategorias() {
  await carregarCategorias();
  return getCategorias();
}

export function filtrarCategorias(textoBusca) {
  getCategoriaAutocomplete()?.filtrar?.(textoBusca || '');
}

export function limparCategoriaSelecionada() {
  limparAutocomplete(getCategoriaAutocomplete());
}

export function limparSubcategoriaSelecionada() {
  limparAutocomplete(getSubcategoriaAutocomplete());
}
