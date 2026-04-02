import { stateTransacoes } from './state.js';
import {
  $,
  criarPaginacao,
  criarControladorListagemFiltrada,
  filtrarPorCategoria,
  filtrarPorTexto,
  filtrarPorTipo,
  filtrarPorStatus,
} from '../helpers/index.js';
import { templateTransacaoCard } from './templates.js';
import { mostrarNotificacao, tratarErro } from '../notification.js';
import { carregarTransacoes as carregarTransacoesService } from './service.js';
import { initTransacaoFilters } from './filters.js';

const paginacaoTransacoes = criarPaginacao({
  containerId: 'paginationTransacoes',
  prevButtonId: 'btnAnteriorTransacoes',
  nextButtonId: 'btnProximoTransacoes',
  infoId: 'pageInfoTransacoes',
  limit: 10,
  onChange: async () => {
    controladorListagemTransacoes.render();
  },
});

function obterItensOrdenadosTransacoes() {
  const itensOrdenados = [...stateTransacoes.itens];

  if (stateTransacoes.ordenarPor === 'nome') {
    itensOrdenados.sort((a, b) =>
      (a.titulo || '').localeCompare(b.titulo || '', 'pt-BR', { numeric: true })
    );
  } else {
    itensOrdenados.sort((a, b) => {
      const dataA = new Date(a.data || a.createdAt || 0);
      const dataB = new Date(b.data || b.createdAt || 0);
      return dataB - dataA;
    });
  }

  return itensOrdenados;
}

const controladorListagemTransacoes = criarControladorListagemFiltrada({
  containerId: 'transacoes',
  getLista: obterItensOrdenadosTransacoes,
  filtrarItens: (itensOrdenados) => {
    const comCategoria = filtrarPorCategoria(
      itensOrdenados,
      stateTransacoes.filtroCategoriaId
    );
    const comTipo = filtrarPorTipo(comCategoria, stateTransacoes.filtroTipo);
    const comStatus = filtrarPorStatus(comTipo, stateTransacoes.filtroStatus);
    return filtrarPorTexto(comStatus, stateTransacoes.filtroTexto);
  },
  renderCardFn: templateTransacaoCard,
  paginacao: paginacaoTransacoes,
  totalId: 'totalTransacoes',
  fnTotal: (transacao) =>
    transacao.tipo === 'saida'
      ? -Number(transacao.valor || 0)
      : Number(transacao.valor || 0),
});

export async function carregarTransacoes(
  ordenarPor = stateTransacoes.ordenarPor
) {
  return carregarTransacoesService(ordenarPor);
}

function renderizarPaginaTransacoes() {
  controladorListagemTransacoes.render();
}

export async function listarTransacoes() {
  const container = $('transacoes');
  // Gera HTML de um card de transacao
  if (!container) return;

  try {
    await carregarTransacoes(stateTransacoes.ordenarPor);
    renderizarPaginaTransacoes();
  } catch (erro) {
    const msg = tratarErro(erro, 'Erro ao carregar transações');
    mostrarNotificacao(msg, 'erro');
  }
}

export async function initTransacoesList() {
  const container = $('transacoes');
  if (!container) return;

  paginacaoTransacoes.init();
  await initTransacaoFilters({
    state: stateTransacoes,
    renderFn: renderizarPaginaTransacoes,
    listarFn: listarTransacoes,
    paginacao: paginacaoTransacoes,
  });
  await listarTransacoes();
}
