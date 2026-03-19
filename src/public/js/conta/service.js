import { fetchContas } from './api.js';
import { createContaState } from './state.js';
import { mostrarNotificacao, tratarErro } from '../notification.js';

const state = createContaState();

export async function obterContas() {
  if (state.hasContas()) {
    return state.getContas();
  }

  try {
    const contas = await fetchContas();
    state.setContas(contas);
    return contas;
  } catch (error) {
    const msg = tratarErro(error, 'Erro ao carregar contas');
    mostrarNotificacao(msg, 'erro');
    return [];
  }
}

export function invalidateContas() {
  state.invalidateContas();
}
