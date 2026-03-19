import {
  fetchSalarios,
  createSalario as apiCreateSalario,
  updateSalario as apiUpdateSalario,
  deleteSalario as apiDeleteSalario,
} from './api.js';
import {
  getSalariosCache,
  setSalariosCache,
  invalidateSalariosCache,
} from './state.js';
import { mostrarNotificacao, tratarErro } from '../notification.js';

export async function listarSalarios() {
  const cache = getSalariosCache();
  if (cache) return cache;

  try {
    const salarios = await fetchSalarios();
    setSalariosCache(salarios);
    return salarios;
  } catch (error) {
    const msg = tratarErro(error, 'Erro ao carregar salários');
    mostrarNotificacao(msg, 'erro');
    return [];
  }
}

export function invalidateSalarios() {
  invalidateSalariosCache();
}

export async function invalidarEListarSalarios() {
  invalidateSalarios();
  return listarSalarios();
}

export async function criarSalario(payload) {
  const result = await apiCreateSalario(payload);
  invalidateSalarios();
  return result;
}

export async function atualizarSalario(id, payload) {
  const result = await apiUpdateSalario(id, payload);
  invalidateSalarios();
  return result;
}

export async function deletarSalario(id) {
  const result = await apiDeleteSalario(id);
  invalidateSalarios();
  return result;
}
