import { mostrarNotificacao, tratarErro } from '../notification.js';
import { renderResumo, renderProjecao, hideProjecao } from './render.js';
import { setupProjecaoModal } from './modal.js';
import { createInicioState } from './state.js';

const state = createInicioState();
let initPromise;

async function loadResumo() {
  try {
    const dados = await state.loadResumo();
    renderResumo(dados, state.getEls());
    return dados;
  } catch (err) {
    const msg = tratarErro(err, 'Erro ao carregar resumo');
    mostrarNotificacao(msg, 'erro');
    return null;
  }
}

async function loadProjecao() {
  try {
    const dados = await state.loadProjecao();
    renderProjecao(dados, state.getEls());
    return dados;
  } catch (err) {
    const msg = tratarErro(err, 'Erro ao carregar projeção');
    mostrarNotificacao(msg, 'erro');
    return null;
  }
}

export async function carregarResumo() {
  state.initElements();
  return loadResumo();
}

export async function carregarProjecao() {
  state.initElements();
  return loadProjecao();
}

export async function initInicio() {
  if (initPromise) {
    return initPromise;
  }

  initPromise = (async () => {
    state.initElements();

    // Somente inicializa se a página possui o resumo financeiro.
    if (!state.hasResumoElements()) return;

    const els = state.getEls();
    const modalController = setupProjecaoModal({
      modal: els.modalProjecao,
      btnAbrir: els.btnProjecao,
      btnFechar: els.fecharModal,
      onOpen: loadProjecao,
      onClose: () => {
        hideProjecao(els);
      },
    });

    // Carrega dados iniciais.
    await loadResumo();

    return modalController;
  })();

  return initPromise;
}
