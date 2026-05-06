import {
  erroUsuario,
  mostrarNotificacao,
  tratarErro,
} from '../notification.js';
import { renderResumo, renderProjecao, hideProjecao } from './render.js';
import { setupProjecaoModal } from './modal.js';
import { createInicioState } from './state.js';

const {
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  subMonths,
  subYears,
} = window.dateFns;

const state = createInicioState();
let initPromise;

// Converte um Date para o formato aceito pelos inputs type=date.
function formatarDataInput(data) {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

// Retorna o intervalo completo do mes atual.
function obterPeriodoMesAtual() {
  const hoje = new Date();
  const inicioMes = startOfMonth(hoje);
  const fimMes = endOfMonth(hoje);

  return {
    dataInicio: formatarDataInput(inicioMes),
    dataFim: formatarDataInput(fimMes),
  };
}

// Monta o periodo correspondente aos atalhos do filtro.
function obterPeriodoAtalho(tipoAtalho) {
  const hoje = new Date();

  if (tipoAtalho === 'ultimo-mes') {
    const ultimoMes = subMonths(hoje, 1);
    const inicio = startOfMonth(ultimoMes);
    const fim = endOfMonth(ultimoMes);

    return {
      dataInicio: formatarDataInput(inicio),
      dataFim: formatarDataInput(fim),
    };
  }

  if (tipoAtalho === 'ultimo-ano') {
    const ultimoAno = subYears(hoje, 1);
    const inicio = startOfYear(ultimoAno);
    const fim = endOfYear(ultimoAno);

    return {
      dataInicio: formatarDataInput(inicio),
      dataFim: formatarDataInput(fim),
    };
  }

  if (tipoAtalho === 'esse-ano') {
    const anoAtual = hoje.getFullYear();

    return {
      dataInicio: formatarDataInput(new Date(anoAtual, 0, 1)),
      dataFim: formatarDataInput(new Date(anoAtual, 11, 31)),
    };
  }

  // Default: período atual
  return obterPeriodoMesAtual();
}

// Destaca visualmente o atalho de periodo selecionado.
function atualizarAtalhoAtivo(tipoAtalhoAtivo = '') {
  const els = state.getEls();

  els.atalhosPeriodoResumo?.forEach((botao) => {
    botao.classList.toggle(
      'is-active',
      botao.dataset.periodo === tipoAtalhoAtivo
    );
  });
}

// Preenche os campos do formulario com um periodo informado.
function preencherFiltroResumo(periodo = obterPeriodoMesAtual()) {
  const els = state.getEls();

  if (els.filtroDataInicio) {
    els.filtroDataInicio.value = periodo.dataInicio || '';
  }

  if (els.filtroDataFim) {
    els.filtroDataFim.value = periodo.dataFim || '';
  }
}

// Remove o destaque visual de qualquer atalho selecionado.
function limparAtalhoAtivo() {
  atualizarAtalhoAtivo('');
}

// Sincroniza o estado interno com os valores atuais do formulario.
function syncFiltrosResumo() {
  const els = state.getEls();

  return state.setFiltrosResumo({
    dataInicio: els.filtroDataInicio?.value || '',
    dataFim: els.filtroDataFim?.value || '',
  });
}

// Valida o intervalo informado antes de chamar a API.
function validarFiltrosResumo(filtros = {}) {
  const { dataInicio, dataFim } = filtros;

  if (!dataInicio && !dataFim) {
    return;
  }

  if (!dataInicio || !dataFim) {
    throw erroUsuario(
      'Informe as duas datas para filtrar o resumo por período.'
    );
  }

  if (dataInicio > dataFim) {
    throw erroUsuario('A data de início não pode ser maior que a data de fim.');
  }
}

// Centraliza o tratamento de erro do resumo e da projecao.
function tratarErroResumo(err, mensagemPadrao) {
  const msg = tratarErro(err, mensagemPadrao);
  mostrarNotificacao(msg, 'erro');
  return null;
}

// Recarrega resumo e projecao quando o modal estiver aberto.
async function reloadResumoAndProjecaoSeNecessario() {
  validarFiltrosResumo(state.getFiltrosResumo());

  const dadosResumo = await loadResumo();
  const els = state.getEls();
  const modalAberto =
    els.modalProjecao && !els.modalProjecao.classList.contains('is-hidden');

  if (modalAberto) {
    await loadProjecao();
  }

  return dadosResumo;
}

// Aplica os filtros atuais com tratamento padronizado de erro.
async function aplicarFiltrosResumo() {
  try {
    return await reloadResumoAndProjecaoSeNecessario();
  } catch (err) {
    return tratarErroResumo(err, 'Erro ao aplicar filtro do resumo');
  }
}

// Atualiza o resumo a partir dos valores atuais do formulario.
async function atualizarResumoComFormulario(tipoAtalhoAtivo = '') {
  atualizarAtalhoAtivo(tipoAtalhoAtivo);
  syncFiltrosResumo();
  return aplicarFiltrosResumo();
}

// Registra os eventos do formulario e dos atalhos do filtro.
function bindFiltroResumo() {
  const els = state.getEls();

  if (!els.formFiltroResumo || els.formFiltroResumo.dataset.bound === 'true') {
    return;
  }

  els.formFiltroResumo.dataset.bound = 'true';

  els.formFiltroResumo.addEventListener('submit', async (event) => {
    event.preventDefault();
    await atualizarResumoComFormulario();
  });

  els.filtroDataInicio?.addEventListener('input', () => {
    limparAtalhoAtivo();
  });

  els.filtroDataFim?.addEventListener('input', () => {
    limparAtalhoAtivo();
  });

  els.btnLimparFiltroResumo?.addEventListener('click', async () => {
    preencherFiltroResumo();
    await atualizarResumoComFormulario();
  });

  els.atalhosPeriodoResumo?.forEach((botao) => {
    botao.addEventListener('click', async () => {
      const periodo = obterPeriodoAtalho(botao.dataset.periodo);

      preencherFiltroResumo(periodo);
      await atualizarResumoComFormulario(botao.dataset.periodo || '');
    });
  });
}

// Carrega o resumo financeiro principal da tela.
async function loadResumo() {
  try {
    const dados = await state.loadResumo();
    renderResumo(dados, state.getEls());
    return dados;
  } catch (err) {
    return tratarErroResumo(err, 'Erro ao carregar resumo');
  }
}

// Carrega a projecao usada no modal de pendentes.
async function loadProjecao() {
  try {
    const dados = await state.loadProjecao();
    renderProjecao(dados, state.getEls());
    return dados;
  } catch (err) {
    return tratarErroResumo(err, 'Erro ao carregar projeção');
  }
}

// Recarrega o resumo de forma publica para outras telas.
export async function carregarResumo() {
  state.initElements();
  return loadResumo();
}

// Recarrega a projecao de forma publica para outras telas.
export async function carregarProjecao() {
  state.initElements();
  return loadProjecao();
}

// Inicializa os elementos e comportamentos da tela inicial.
export async function initInicio() {
  if (initPromise) {
    return initPromise;
  }

  initPromise = (async () => {
    state.initElements();

    // Somente inicializa se a página possui o resumo financeiro.
    if (!state.hasResumoElements()) return;

    const els = state.getEls();
    preencherFiltroResumo();
    syncFiltrosResumo();
    bindFiltroResumo();
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
