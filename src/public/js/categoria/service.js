import { fetchCategorias, fetchSubcategorias } from './api.js';
import { createCategoriaState } from './state.js';

const state = createCategoriaState();

export async function carregarCategorias() {
  const categorias = await fetchCategorias();
  state.setCategorias(categorias);
  return categorias;
}

export async function carregarSubcategorias(categoriaId) {
  if (!categoriaId) return [];

  const cached = state.getSubcategorias(categoriaId);
  if (cached && cached.length > 0) {
    return cached;
  }

  const subcategorias = await fetchSubcategorias(categoriaId);
  state.setSubcategorias(categoriaId, subcategorias);
  return subcategorias;
}

export function getCategorias() {
  return state.getCategorias();
}

export function setCategoriaAutocomplete(instance) {
  state.setAutocompleteCategoria(instance);
}

export function getCategoriaAutocomplete() {
  return state.getAutocompleteCategoria();
}

export function setSubcategoriaAutocomplete(instance) {
  state.setAutocompleteSubcategoria(instance);
}

export function getSubcategoriaAutocomplete() {
  return state.getAutocompleteSubcategoria();
}
