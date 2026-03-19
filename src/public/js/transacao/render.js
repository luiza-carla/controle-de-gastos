import { stateTransacoes } from './state.js';
import {
  $,
  criarPaginacao,
  filtrarPorCategoria,
  filtrarPorTexto,
  filtrarPorTipo,
  renderizarListagemFiltrada,
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
    renderizarPaginaTransacoes();
  },
});

export async function carregarTransacoes(
  ordenarPor = stateTransacoes.ordenarPor
) {
  return carregarTransacoesService(ordenarPor);
}

function renderizarPaginaTransacoes() {
  const fnTotal = (t) =>
    t.tipo === 'saida' ? -Number(t.valor || 0) : Number(t.valor || 0);

  // Ordena os itens de acordo com a seleção do usuário
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

  renderizarListagemFiltrada(
    'transacoes',
    itensOrdenados,
    () => {
      const comCategoria = filtrarPorCategoria(
        itensOrdenados,
        stateTransacoes.filtroCategoriaId
      );
      const comTipo = filtrarPorTipo(comCategoria, stateTransacoes.filtroTipo);
      return filtrarPorTexto(comTipo, stateTransacoes.filtroTexto);
    },
    templateTransacaoCard,
    paginacaoTransacoes,
    'totalTransacoes',
    fnTotal
  );
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
  initTransacaoFilters({
    state: stateTransacoes,
    renderFn: renderizarPaginaTransacoes,
    listarFn: listarTransacoes,
    paginacao: paginacaoTransacoes,
  });
  await listarTransacoes();
}
