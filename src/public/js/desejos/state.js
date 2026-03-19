import {
  criarPaginacao,
  filtrarPorCategoria,
  filtrarPorTexto,
} from '../helpers/index.js';

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
      const itens = [...this.itens];

      if (this.ordenarPor === 'nome') {
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

      const porCategoria = filtrarPorCategoria(itens, this.filtroCategoriaId);
      return filtrarPorTexto(porCategoria, this.filtroTexto);
    },

    getPageItems() {
      const itens = this.getFilteredItems();
      const { skip, limit } = this.pagination.getParams();
      return itens.slice(skip, skip + limit);
    },

    getTotalItems() {
      return this.getFilteredItems().length;
    },

    getTotalValor() {
      return this.getFilteredItems().reduce(
        (acc, item) => acc + (Number(item.valor) || 0),
        0
      );
    },
  };

  return state;
}
