import { setTextById, setHTMLById } from './dom.js';
import { formatarValor, calcularTotalItens } from './format.js';
import { somarDinheiro } from './money.js';

/**
 * Atualiza o total estimado exibido em uma listagem.
 * @param {string} idElemento - id do elemento HTML onde exibir o total
 * @param {Array} lista - lista de itens filtrados
 * @param {Function} [fnTotal] - função para extrair valor de cada item (opcional)
 */
export function atualizarResumoTotalListagem(idElemento, lista, fnTotal) {
  const total = calcularTotalItens(lista, fnTotal);
  setTextById(idElemento, `R$ ${formatarValor(total)}`);
}

export function criarColecaoFiltrada({
  getItens,
  getParamsPaginacao,
  aplicarFiltros,
  calcularValorTotal,
}) {
  function obterItensBase() {
    const itens = typeof getItens === 'function' ? getItens() : [];
    return Array.isArray(itens) ? itens : [];
  }

  function getFilteredItems() {
    const itens = [...obterItensBase()];
    return typeof aplicarFiltros === 'function' ? aplicarFiltros(itens) : itens;
  }

  function getPageItems() {
    const itens = getFilteredItems();
    const { skip = 0, limit = itens.length } =
      (typeof getParamsPaginacao === 'function' && getParamsPaginacao()) || {};

    return itens.slice(skip, skip + limit);
  }

  function getTotalItems() {
    return getFilteredItems().length;
  }

  function getTotalValor() {
    return getFilteredItems().reduce(
      (acc, item) => somarDinheiro(acc, calcularValorTotal?.(item) || 0),
      0
    );
  }

  return {
    getFilteredItems,
    getPageItems,
    getTotalItems,
    getTotalValor,
  };
}

export function criarControladorListagemFiltrada({
  containerId,
  getLista,
  filtrarItens,
  renderCardFn,
  paginacao,
  totalId,
  fnTotal,
}) {
  function obterItensFiltrados() {
    const lista = typeof getLista === 'function' ? getLista() : [];
    const itens = Array.isArray(lista) ? lista : [];

    return typeof filtrarItens === 'function' ? filtrarItens(itens) : itens;
  }

  function render() {
    const itensFiltrados = obterItensFiltrados();
    const { skip = 0, limit = itensFiltrados.length } = paginacao.getParams();
    const totalItens = itensFiltrados.length;
    const itensPagina = itensFiltrados.slice(skip, skip + limit);

    setHTMLById(containerId, itensPagina.map(renderCardFn).join(''));
    paginacao.setTotal(totalItens);

    if (totalId) {
      atualizarResumoTotalListagem(totalId, itensFiltrados, fnTotal);
    }

    return {
      itensFiltrados,
      itensPagina,
      totalItens,
    };
  }

  return {
    obterItensFiltrados,
    render,
  };
}

// Renderiza uma listagem filtrada com paginação e total, alternativa à função
// colocada anteriormente em listagemFiltrada.js. Mantemos assinatura compatível.
export function renderizarListagemFiltrada(
  containerId,
  listaOriginal,
  filtroFn,
  renderCardFn,
  paginacaoObj,
  totalId,
  fnTotal
) {
  return criarControladorListagemFiltrada({
    containerId,
    getLista: () => listaOriginal,
    filtrarItens: filtroFn,
    renderCardFn,
    paginacao: paginacaoObj,
    totalId,
    fnTotal,
  }).render();
}
