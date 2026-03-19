import { apiFetch } from '../config.js';

const BASE_URL = `${window.location.origin}/lista-desejos`;

export const desejosService = {
  async listar(ordenarPor) {
    const params = new URLSearchParams();
    if (ordenarPor) params.set('ordenarPor', ordenarPor);
    const url = params.toString()
      ? `${BASE_URL}?${params.toString()}`
      : BASE_URL;
    return apiFetch(url);
  },

  criar(dados) {
    return apiFetch(BASE_URL, {
      method: 'POST',
      body: JSON.stringify(dados),
    });
  },

  atualizar(id, dados) {
    return apiFetch(`${BASE_URL}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(dados),
    });
  },

  deletar(id) {
    return apiFetch(`${BASE_URL}/${id}`, {
      method: 'DELETE',
    });
  },

  realizar(id, dados) {
    return apiFetch(`${BASE_URL}/${id}/realizar`, {
      method: 'POST',
      body: JSON.stringify(dados),
    });
  },

  listarCategorias() {
    return apiFetch(`${window.location.origin}/categorias`);
  },

  listarContas() {
    return apiFetch(`${window.location.origin}/contas`);
  },

  carregarCarteira() {
    return apiFetch('/carteira');
  },
};
