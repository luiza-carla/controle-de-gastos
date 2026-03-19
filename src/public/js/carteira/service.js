import { fetchCarteira } from './api.js';
import { createCarteiraState } from './state.js';
import { mostrarNotificacao, tratarErro } from '../notification.js';

const state = createCarteiraState();

export async function obterCarteira() {
  if (state.has()) {
    return state.get();
  }

  try {
    const carteira = await fetchCarteira();
    state.set(carteira);
    return carteira;
  } catch (error) {
    const msg = tratarErro(error, 'Erro ao obter carteira');
    mostrarNotificacao(msg, 'erro');
    return null;
  }
}

export function invalidateCarteira() {
  state.invalidate();
}
