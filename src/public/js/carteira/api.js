import { apiFetch } from '../config.js';

const BASE_PATH = '/carteira';

export async function fetchCarteira() {
  return apiFetch(BASE_PATH);
}

export async function atualizarCarteira(valor) {
  return apiFetch(BASE_PATH, {
    method: 'PUT',
    body: JSON.stringify({ valor }),
  });
}

export async function transferirParaConta(contaId, valor) {
  return apiFetch(`${BASE_PATH}/transferir`, {
    method: 'POST',
    body: JSON.stringify({ contaId, valor, direcao: 'carteira-para-conta' }),
  });
}
