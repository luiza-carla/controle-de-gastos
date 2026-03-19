import { apiFetch } from '../config.js';

const BASE_URL = `${window.location.origin}/categorias`;

export async function fetchCategorias() {
  return apiFetch(BASE_URL);
}

export async function fetchSubcategorias(categoriaId) {
  return apiFetch(`${BASE_URL}/${categoriaId}/subcategorias`);
}
