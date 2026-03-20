import { apiFetch } from '../config.js';

const RESUMO_ENDPOINT = '/resumo';
const PROJECAO_ENDPOINT = '/resumo/projecao';

export async function fetchResumo() {
  return apiFetch(RESUMO_ENDPOINT);
}

export async function fetchProjecao() {
  return apiFetch(PROJECAO_ENDPOINT);
}
