import {
  fetchTransacoes,
  createTransacao as apiCreateTransacao,
  updateTransacao as apiUpdateTransacao,
  deleteTransacao as apiDeleteTransacao,
} from './api.js';
import { stateTransacoes } from './state.js';
import { mostrarNotificacao, tratarErro } from '../notification.js';

export async function carregarTransacoes(
  ordenarPor = stateTransacoes.ordenarPor
) {
  if (!ordenarPor) ordenarPor = stateTransacoes.ordenarPor || 'data';

  // Retorna cache se a ordenação não mudou e já temos itens
  if (
    stateTransacoes.itens &&
    stateTransacoes.itens.length > 0 &&
    stateTransacoes.ordenarPor === ordenarPor
  ) {
    return stateTransacoes.itens;
  }

  try {
    const transacoes = await fetchTransacoes(ordenarPor);
    stateTransacoes.itens = transacoes || [];
    stateTransacoes.ordenarPor = ordenarPor;
    return stateTransacoes.itens;
  } catch (erro) {
    const msg = tratarErro(erro, 'Erro ao carregar transações');
    mostrarNotificacao(msg, 'erro');
    return [];
  }
}

export function obterTransacaoPorId(id) {
  if (!id) return null;
  return (
    (stateTransacoes.itens || []).find((t) => String(t._id) === String(id)) ||
    null
  );
}

export function invalidarTransacoes() {
  stateTransacoes.itens = [];
}

export async function criarTransacao(payload) {
  const result = await apiCreateTransacao(payload);
  invalidarTransacoes();
  return result;
}

export async function atualizarTransacao(id, payload) {
  const result = await apiUpdateTransacao(id, payload);
  invalidarTransacoes();
  return result;
}

export async function deletarTransacao(id) {
  const result = await apiDeleteTransacao(id);
  invalidarTransacoes();
  return result;
}
