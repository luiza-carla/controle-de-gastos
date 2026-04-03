import { apiFetch } from '../config.js';

const RESUMO_ENDPOINT = '/resumo';
const PROJECAO_ENDPOINT = '/resumo/projecao';

function buildEndpoint(baseUrl, filtros = {}) {
  const params = new URLSearchParams();

  if (filtros?.dataInicio) {
    params.set('dataInicio', filtros.dataInicio);
  }

  if (filtros?.dataFim) {
    params.set('dataFim', filtros.dataFim);
  }

  const query = params.toString();
  return query ? `${baseUrl}?${query}` : baseUrl;
}

export async function fetchResumo(filtros = {}) {
  return apiFetch(buildEndpoint(RESUMO_ENDPOINT, filtros));
}

export async function fetchProjecao(filtros = {}) {
  return apiFetch(buildEndpoint(PROJECAO_ENDPOINT, filtros));
}
