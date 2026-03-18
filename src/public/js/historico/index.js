import { criarPaginacao } from '../helpers/index.js';
import { showElement, hideElement } from '../helpers/index.js';
import { criarHistoricoState } from './state.js';
import { fetchHistoricos, desfazerHistorico } from './api.js';
import { renderHistoricoLista, alternarDetalhesAlteracoes } from './render.js';
import { mostrarNotificacao, tratarErro } from '../notification.js';
import { abrirModalConfirmacao, fecharModal } from '../modalDeletar.js';

const state = criarHistoricoState();

const paginacaoHistorico = criarPaginacao({
  containerId: 'pagination',
  prevButtonId: 'btn-anterior',
  nextButtonId: 'btn-proximo',
  infoId: 'page-info',
  limit: 20,
  onChange: carregarHistorico,
});

export async function initHistorico() {
  inicializarEventos();
  paginacaoHistorico.init();
  await carregarHistorico();
}

function inicializarEventos() {
  const btnLimpar = document.getElementById('btn-limpar-filtros');
  if (btnLimpar) {
    btnLimpar.addEventListener('click', () => {
      limparFiltros();
      carregarHistorico();
    });
  }

  // Filtro automático ao mudar qualquer select
  ['filtro-entidade', 'filtro-acao', 'filtro-status', 'filtro-ordenar'].forEach(
    (id) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('change', () => {
        aplicarFiltros();
        carregarHistorico();
      });
    }
  );

  // Delegação para botões de desfazer e toggles adicionados dinamicamente
  const historicoLista = document.getElementById('historico-lista');
  if (!historicoLista) return;

  historicoLista.addEventListener('click', async (event) => {
    const toggleBtn = event.target.closest('.alteracoes-toggle');
    if (toggleBtn) {
      alternarDetalhesAlteracoes(toggleBtn);
      return;
    }

    const btn = event.target.closest('button[data-historico-id]');
    if (btn) {
      await desfazerAcao(btn.dataset.historicoId);
    }
  });
}

function getFiltrosDoFormulario() {
  const entidade = document.getElementById('filtro-entidade')?.value || '';
  const acao = document.getElementById('filtro-acao')?.value || '';
  const desfeito = document.getElementById('filtro-status')?.value || '';
  const ordenarPor = document.getElementById('filtro-ordenar')?.value || 'data';

  return { entidade, acao, desfeito, ordenarPor };
}

function aplicarFiltros() {
  state.setFiltros(getFiltrosDoFormulario());
  paginacaoHistorico.resetar();
}

function limparFiltros() {
  const selectIds = [
    'filtro-entidade',
    'filtro-acao',
    'filtro-status',
    'filtro-ordenar',
  ];

  selectIds.forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.value = id === 'filtro-ordenar' ? 'data' : '';
  });

  state.resetFiltros();
  paginacaoHistorico.resetar();
}

async function carregarHistorico() {
  try {
    mostrarLoading(true);

    const filtros = state.getFiltros();
    const { skip, limit } = paginacaoHistorico.getParams();

    const resultado = await fetchHistoricos({ skip, limit, filtros });

    state.setHistoricos(resultado.data || []);

    const total = resultado.pagination?.total || 0;
    const paginaAjustada = paginacaoHistorico.setTotal(total);

    if (paginaAjustada) {
      await paginacaoHistorico.notificarMudanca();
      return;
    }

    renderHistoricoLista(state.getHistoricos());
  } catch (error) {
    const msg = tratarErro(error, 'Erro ao carregar histórico');
    mostrarNotificacao(msg, 'erro');
  } finally {
    mostrarLoading(false);
  }
}

function mostrarLoading(mostrar) {
  const loading = document.getElementById('loading');
  const lista = document.getElementById('historico-lista');

  if (mostrar) {
    showElement(loading);
    hideElement(lista);
    return;
  }

  hideElement(loading);
}

async function desfazerAcao(historicoId) {
  abrirModalConfirmacao({
    titulo: 'Desfazer ação',
    mensagem: 'Tem certeza que deseja desfazer esta ação?',
    onConfirmar: async () => {
      fecharModal();
      try {
        const resultado = await desfazerHistorico(historicoId);

        mostrarNotificacao(
          resultado.message || 'Ação desfeita com sucesso',
          'sucesso'
        );

        await carregarHistorico();
      } catch (error) {
        const msg = tratarErro(error, 'Erro ao desfazer ação');
        mostrarNotificacao(msg, 'erro');
      }
    },
  });
}
