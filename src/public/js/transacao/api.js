import { apiFetch } from '../config.js';

const URL_TRANSACOES = `${window.location.origin}/transacoes`;

export async function fetchTransacoes(ordenarPor) {
  const params = new URLSearchParams();
  if (ordenarPor) {
    params.set('ordenarPor', ordenarPor);
  }

  const url = params.toString()
    ? `${URL_TRANSACOES}?${params.toString()}`
    : URL_TRANSACOES;

  return apiFetch(url);
}

export async function createTransacao(payload) {
  return apiFetch(URL_TRANSACOES, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateTransacao(id, payload) {
  return apiFetch(`${URL_TRANSACOES}/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function deleteTransacao(id) {
  return apiFetch(`${URL_TRANSACOES}/${id}`, {
    method: 'DELETE',
  });
}
