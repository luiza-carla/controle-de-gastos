import { setTextById, setHTMLById } from './dom.js';
import { formatarValor, calcularTotalItens } from './format.js';

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
  const itensFiltrados = filtroFn(listaOriginal);
  const { skip, limit } = paginacaoObj.getParams();
  const totalItens = itensFiltrados.length;
  const itensPagina = itensFiltrados.slice(skip, skip + limit);

  setHTMLById(containerId, itensPagina.map(renderCardFn).join(''));
  paginacaoObj.setTotal(totalItens);
  atualizarResumoTotalListagem(totalId, itensFiltrados, fnTotal);
}
