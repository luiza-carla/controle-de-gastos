import { apiFetch } from '../config.js';

const BASE_URL = '/contas';

export async function fetchContas() {
  return apiFetch(BASE_URL);
}

export async function createConta({ nome, tipo, saldo, limite }) {
  return apiFetch(BASE_URL, {
    method: 'POST',
    body: JSON.stringify({ nome, tipo, saldo, limite }),
  });
}

export async function updateConta(id, { nome }) {
  return apiFetch(`${BASE_URL}/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ nome }),
  });
}

export async function deleteConta(id) {
  return apiFetch(`${BASE_URL}/${id}`, {
    method: 'DELETE',
  });
}

export async function transferirEntreContas(
  contaOrigemId,
  contaDestinoId,
  valor
) {
  return apiFetch(`${BASE_URL}/${contaOrigemId}/transferir`, {
    method: 'POST',
    body: JSON.stringify({ contaDestinoId: contaDestinoId, valor }),
  });
}

export async function transferirParaCarteira(contaOrigemId, valor) {
  return apiFetch('/carteira/transferir', {
    method: 'POST',
    body: JSON.stringify({
      contaId: contaOrigemId,
      valor,
      direcao: 'conta-para-carteira',
    }),
  });
}
