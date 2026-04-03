import {
  criarPaginacao,
  showElement,
  hideElement,
  $,
} from '../helpers/index.js';
import { criarHistoricoState } from './state.js';
import { fetchHistoricos, desfazerHistorico } from './api.js';
import { criarControladorHistorico } from './render.js';
import { initHistoricoFilters } from './filters.js';
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

const controladorHistorico = criarControladorHistorico({
  onDesfazer: desfazerAcao,
});

export async function initHistorico() {
  initHistoricoFilters({
    state,
    paginacao: paginacaoHistorico,
    onReload: carregarHistorico,
  });
  paginacaoHistorico.init();
  controladorHistorico.init();
  await carregarHistorico();
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

    controladorHistorico.render(state.getHistoricos());
  } catch (error) {
    const msg = tratarErro(error, 'Erro ao carregar histórico');
    mostrarNotificacao(msg, 'erro');
  } finally {
    mostrarLoading(false);
  }
}

function mostrarLoading(mostrar) {
  const loading = $('loading');
  const lista = $('historico-lista');

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
          resultado.message || 'Ação desfeita com sucesso!',
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
