import { apiFetch } from '../config.js';

const BASE_URL = '/faturas';

export function listarFaturas() {
  return apiFetch(BASE_URL);
}
