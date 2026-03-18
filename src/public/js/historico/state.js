// Responsável por encapsular o estado do histórico e expor métodos controlados.

export function criarHistoricoState(initial = {}) {
  const state = {
    historicos: Array.isArray(initial.historicos) ? initial.historicos : [],
    filtros: {
      entidade: '',
      acao: '',
      desfeito: '',
      ordenarPor: 'data',
      ...initial.filtros,
    },
  };

  return {
    getHistoricos() {
      return state.historicos;
    },

    setHistoricos(historicos) {
      state.historicos = Array.isArray(historicos) ? historicos : [];
    },

    getFiltros() {
      return { ...state.filtros };
    },

    setFiltros(filtros) {
      Object.assign(state.filtros, filtros);
    },

    resetFiltros() {
      state.filtros = {
        entidade: '',
        acao: '',
        desfeito: '',
        ordenarPor: 'data',
      };
    },
  };
}
