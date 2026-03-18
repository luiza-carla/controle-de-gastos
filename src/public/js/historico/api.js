import { apiFetch } from '../config.js';

const BASE_ENDPOINT = `${window.location.origin}/historico`;

export async function fetchHistoricos({ skip, limit, filtros }) {
  const params = new URLSearchParams({
    skip: String(skip),
    limit: String(limit),
  });

  if (filtros?.entidade) params.append('entidade', filtros.entidade);
  if (filtros?.acao) params.append('acao', filtros.acao);
  if (filtros?.desfeito !== '') params.append('desfeito', filtros.desfeito);
  if (filtros?.ordenarPor) params.append('ordenarPor', filtros.ordenarPor);

  return apiFetch(`${BASE_ENDPOINT}?${params}`);
}

export async function desfazerHistorico(id) {
  return apiFetch(`${BASE_ENDPOINT}/${id}/desfazer`, {
    method: 'POST',
  });
}
