// Estado local da funcionalidade de categorias

export function createCategoriaState() {
  const state = {
    categorias: [],
    subcategoriasPorCategoria: new Map(),
    autocompleteCategoria: null,
    autocompleteSubcategoria: null,
  };

  return {
    getCategorias() {
      return state.categorias;
    },

    setCategorias(categorias) {
      state.categorias = Array.isArray(categorias) ? categorias : [];
    },

    getSubcategorias(categoriaId) {
      return state.subcategoriasPorCategoria.get(categoriaId) ?? [];
    },

    setSubcategorias(categoriaId, subcategorias) {
      state.subcategoriasPorCategoria.set(
        categoriaId,
        Array.isArray(subcategorias) ? subcategorias : []
      );
    },

    getAutocompleteCategoria() {
      return state.autocompleteCategoria;
    },

    setAutocompleteCategoria(instance) {
      state.autocompleteCategoria = instance;
    },

    getAutocompleteSubcategoria() {
      return state.autocompleteSubcategoria;
    },

    setAutocompleteSubcategoria(instance) {
      state.autocompleteSubcategoria = instance;
    },
  };
}
