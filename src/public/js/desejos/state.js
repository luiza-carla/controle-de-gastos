import {
  criarColecaoFiltrada,
  criarPaginacao,
  filtrarPorCategoria,
  filtrarPorTexto,
} from '../helpers/index.js';
import { normalizarDinheiro } from '../helpers/money.js';

export function createDesejosState({ onPageChange }) {
  const state = {
    itens: [],
    ordenarPor: 'data',
    filtroCategoriaId: '',
    filtroTexto: '',
    filtroInicializado: false,
    ordenacaoInicializada: false,
    pagination: criarPaginacao({
      containerId: 'paginationDesejos',
      prevButtonId: 'btnAnteriorDesejos',
      nextButtonId: 'btnProximoDesejos',
      infoId: 'pageInfoDesejos',
      limit: 10,
      onChange: () => {
        if (onPageChange) onPageChange();
      },
    }),
  };

  const colecao = criarColecaoFiltrada({
    getItens: () => state.itens,
    getParamsPaginacao: () => state.pagination.getParams(),
    aplicarFiltros: (itens) => {
      if (state.ordenarPor === 'nome') {
        itens.sort((a, b) =>
          (a.titulo || '').localeCompare(b.titulo || '', 'pt-BR', {
            numeric: true,
          })
        );
      } else {
        itens.sort((a, b) => {
          const dataA = new Date(a.createdAt || 0);
          const dataB = new Date(b.createdAt || 0);
          return dataB - dataA;
        });
      }

      const porCategoria = filtrarPorCategoria(itens, state.filtroCategoriaId);
      return filtrarPorTexto(porCategoria, state.filtroTexto);
    },
    calcularValorTotal: (item) => normalizarDinheiro(item.valor) || 0,
  });

  Object.assign(state, {
    setItens(itens = []) {
      this.itens = itens;
    },

    updateItem(updated) {
      this.itens = this.itens.map((item) =>
        item._id === updated._id ? { ...item, ...updated } : item
      );
    },

    removeItem(id) {
      this.itens = this.itens.filter((item) => item._id !== id);
    },

    addItem(item) {
      this.itens = [item, ...this.itens];
    },

    resetFilters() {
      this.filtroCategoriaId = '';
      this.filtroTexto = '';
      this.pagination.resetar();
    },

    getFilteredItems() {
      return colecao.getFilteredItems();
    },

    getPageItems() {
      return colecao.getPageItems();
    },

    getTotalItems() {
      return colecao.getTotalItems();
    },

    getTotalValor() {
      return colecao.getTotalValor();
    },
  });

  return state;
}
