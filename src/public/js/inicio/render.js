import { formatarValor, formatarData } from '../helpers/format.js';
import { clearElement, hideElement } from '../helpers/dom.js';
import {
  getSaldoProjetadoClass,
  formatarCategoriaComSubcategoria,
} from './formatters.js';

// Monta o texto exibido com o periodo atual do resumo.
function obterTextoPeriodo(periodo) {
  if (!periodo?.dataInicio || !periodo?.dataFim) {
    return '';
  }

  const inicio = formatarData(periodo.dataInicio);
  const fim = formatarData(periodo.dataFim);

  return `Período filtrado: ${inicio} até ${fim}`;
}

// Cria um item de lista para o detalhamento de saldos.
function criarItemDetalhe({ nome, valor }) {
  const li = document.createElement('li');
  const nomeEl = document.createElement('span');
  const valorEl = document.createElement('span');

  nomeEl.textContent = nome || '';
  valorEl.textContent = `R$ ${formatarValor(valor)}`;

  li.appendChild(nomeEl);
  li.appendChild(valorEl);
  return li;
}

// Cria uma linha da tabela para entradas e saídas.
function criarLinhaMovimento({ data, categoria, subcategoria, nome, valor }) {
  const tr = document.createElement('tr');
  const dataTd = document.createElement('td');
  const categoriaTd = document.createElement('td');
  const nomeTd = document.createElement('td');
  const valorTd = document.createElement('td');

  dataTd.textContent = data ? formatarData(data) : '';
  categoriaTd.textContent = formatarCategoriaComSubcategoria(
    categoria,
    subcategoria
  );
  nomeTd.textContent = nome || '';
  valorTd.textContent = `R$ ${formatarValor(valor)}`;

  tr.append(dataTd, categoriaTd, nomeTd, valorTd);
  return tr;
}

// Renderiza a lista de detalhes de saldo no card principal.
export function renderDetalhesLista(ul, itens = []) {
  if (!ul) return;
  clearElement(ul);
  const fragment = document.createDocumentFragment();
  itens.forEach((item) => fragment.appendChild(criarItemDetalhe(item)));
  ul.appendChild(fragment);
}

// Renderiza a tabela de movimentos de entradas ou saídas.
export function renderMovimentosTabela(tbody, itens = []) {
  if (!tbody) return;
  clearElement(tbody);
  const fragment = document.createDocumentFragment();
  itens.forEach((item) => fragment.appendChild(criarLinhaMovimento(item)));
  tbody.appendChild(fragment);
}

// Atualiza os valores e detalhes do resumo financeiro na tela.
export function renderResumo(dados, els) {
  if (!dados || !els) return;

  const filtroAtivo = Boolean(dados.periodo?.filtroAtivo);

  if (els.saldoTituloTexto) {
    els.saldoTituloTexto.textContent = filtroAtivo
      ? 'Saldo do período'
      : 'Saldo atual';
  }

  if (els.saldoCalculadoLabel) {
    els.saldoCalculadoLabel.textContent = filtroAtivo
      ? 'Saldo líquido do período:'
      : 'Saldo calculado:';
  }

  if (els.resumoPeriodoInfo) {
    els.resumoPeriodoInfo.textContent = obterTextoPeriodo(dados.periodo);
  }

  if (els.saldoAtual)
    els.saldoAtual.textContent = formatarValor(dados.saldoAtual);
  if (els.totalEntradas)
    els.totalEntradas.textContent = formatarValor(dados.entradas);
  if (els.totalSaidas)
    els.totalSaidas.textContent = formatarValor(dados.saidas);
  if (els.saldoCalculado)
    els.saldoCalculado.textContent = formatarValor(dados.saldoCalculado);

  renderDetalhesLista(els.detSaldoAtualLista, dados.detalhesSaldo);
  renderMovimentosTabela(els.detEntradasLista, dados.detalhesEntradas);
  renderMovimentosTabela(els.detSaidasLista, dados.detalhesSaidas);
}

// Atualiza os valores exibidos no modal de projeção.
export function renderProjecao(dados, els) {
  if (!dados || !els) return;
  if (els.projSaldoAtual)
    els.projSaldoAtual.textContent = formatarValor(dados.saldoAtual);
  if (els.projEntradasPendentes) {
    els.projEntradasPendentes.textContent = formatarValor(
      dados.entradasPendentes
    );
  }
  if (els.projSaidasLabel) {
    els.projSaidasLabel.textContent = 'Saídas pendentes:';
  }
  if (els.projSaidasPendentes)
    els.projSaidasPendentes.textContent = formatarValor(dados.saidasPendentes);
  if (els.projSaldoFinal) {
    els.projSaldoFinal.textContent = formatarValor(dados.saldoProjetado);

    const classe = getSaldoProjetadoClass(dados.saldoProjetado);
    els.projSaldoFinal.classList.remove(
      'saldo-projetado-negativo',
      'saldo-projetado-zero',
      'saldo-projetado-positivo'
    );
    els.projSaldoFinal.classList.add(classe);
  }
}

// Esconde o modal de projeção quando ele é fechado.
export function hideProjecao(els) {
  if (els?.modalProjecao) {
    hideElement(els.modalProjecao);
  }
}
