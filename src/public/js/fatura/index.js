import { $ } from '../helpers/index.js';
import { listarFaturas as listarFaturasApi } from './api.js';
import { renderFaturas } from './render.js';
import { mostrarNotificacao, tratarErro } from '../notification.js';

export async function initFaturas() {
  if (!$('faturasContainer')) {
    return;
  }

  try {
    const faturas = await listarFaturasApi();
    renderFaturas(faturas);
  } catch (erro) {
    renderFaturas([]);
    const mensagem = tratarErro(erro, 'Erro ao carregar faturas');
    mostrarNotificacao(mensagem, 'erro');
  }
}
