import { apiFetch } from '../config.js';

const SALARIO_BASE_URL = window.location.origin + '/salarios';

export async function fetchSalarios() {
  return apiFetch(SALARIO_BASE_URL);
}

export async function createSalario(payload) {
  return apiFetch(SALARIO_BASE_URL, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateSalario(id, payload) {
  return apiFetch(`${SALARIO_BASE_URL}/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function deleteSalario(id) {
  return apiFetch(`${SALARIO_BASE_URL}/${id}`, {
    method: 'DELETE',
  });
}
