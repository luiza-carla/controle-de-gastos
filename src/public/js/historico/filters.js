import { $ } from '../helpers/index.js';

export function initHistoricoFilters({ state, paginacao, onReload }) {
  if (!state || !paginacao || !onReload) return;

  const btnLimpar = $('btn-limpar-filtros');
  if (btnLimpar) {
    btnLimpar.addEventListener('click', () => {
      limparFiltros(state, paginacao);
      onReload();
    });
  }

  // Filtro automático ao mudar qualquer select
  ['filtro-entidade', 'filtro-acao', 'filtro-status', 'filtro-ordenar'].forEach(
    (id) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('change', () => {
        aplicarFiltros(state, paginacao);
        onReload();
      });
    }
  );
}

export function aplicarFiltros(state, paginacao) {
  state.setFiltros(getFiltrosDoFormulario());
  paginacao.resetar();
}

export function limparFiltros(state, paginacao) {
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
  paginacao.resetar();
}

function getFiltrosDoFormulario() {
  const entidade = document.getElementById('filtro-entidade')?.value || '';
  const acao = document.getElementById('filtro-acao')?.value || '';
  const desfeito = document.getElementById('filtro-status')?.value || '';
  const ordenarPor = document.getElementById('filtro-ordenar')?.value || 'data';

  return { entidade, acao, desfeito, ordenarPor };
}
