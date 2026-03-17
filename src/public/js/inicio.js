import { apiFetch } from './config.js';
import {
  addClass,
  formatarValor,
  removeClass,
  setTextById,
  showElement,
  hideElement,
  $,
  escaparHtml,
} from './helpers/index.js';
import { mostrarNotificacao } from './notification.js';

// Carrega resumo financeiro do mês
export async function carregarResumo() {
  try {
    const dados = await apiFetch(window.location.origin + '/resumo');

    setTextById('saldoAtual', formatarValor(dados.saldoAtual));
    setTextById('totalEntradas', formatarValor(dados.entradas));
    setTextById('totalSaidas', formatarValor(dados.saidas));
    setTextById('saldoCalculado', formatarValor(dados.saldoCalculado));

    // preenche listas/detalhes dentro dos collapses
    preencherLista('detSaldoAtualLista', dados.detalhesSaldo);
    preencherTabelaMovimentos('detEntradasLista', dados.detalhesEntradas);
    preencherTabelaMovimentos('detSaidasLista', dados.detalhesSaidas);
  } catch {
    mostrarNotificacao('Erro ao carregar resumo', 'erro');
  }
}

// Abre modal com projeção financeira futura
async function abrirProjecao() {
  try {
    // Busca projeção financeira
    const dados = await apiFetch(window.location.origin + '/resumo/projecao');

    setTextById('projSaldoAtual', formatarValor(dados.saldoAtual));
    setTextById('projSaidasPendentes', formatarValor(dados.saidasPendentes));
    setTextById('projSaldoFinal', formatarValor(dados.saldoProjetado));

    const saldoProjetadoEl = $('projSaldoFinal');
    if (saldoProjetadoEl) {
      removeClass(saldoProjetadoEl, 'saldo-projetado-negativo');
      removeClass(saldoProjetadoEl, 'saldo-projetado-zero');
      removeClass(saldoProjetadoEl, 'saldo-projetado-positivo');

      const saldoProjetado = Number(dados.saldoProjetado) || 0;
      if (saldoProjetado < 0) {
        addClass(saldoProjetadoEl, 'saldo-projetado-negativo');
      } else if (saldoProjetado > 0) {
        addClass(saldoProjetadoEl, 'saldo-projetado-positivo');
      } else {
        addClass(saldoProjetadoEl, 'saldo-projetado-zero');
      }
    }

    // Exibe modal com projeção
    showElement($('modalProjecao'));
  } catch {
    mostrarNotificacao('Erro ao carregar projeção', 'erro');
  }
}

// Carrega listeners quando DOM estiver pronto
// Somente ativa funcionalidades relacionadas ao resumo se algum dos
// elementos principais estiver presente na página; assim evitamos
// requisições desnecessárias em telas públicas (login/registro).

function preencherLista(id, itens = []) {
  const ul = $(id);
  if (!ul) return;
  ul.innerHTML = itens
    .map(
      (item) =>
        `<li><span>${escaparHtml(item.nome)}</span><span>R$ ${formatarValor(
          item.valor
        )}</span></li>`
    )
    .join('');
}

// constroi linhas de uma tabela de movimentos (data, categoria, nome, valor)
function preencherTabelaMovimentos(tbodyId, itens = []) {
  const tbody = $(tbodyId);
  if (!tbody) return;
  tbody.innerHTML = itens
    .map((item) => {
      const data = item.data ? new Date(item.data).toLocaleDateString() : '';
      // se houver subcategoria, concatenamos
      const catTexto = item.subcategoria
        ? `${item.categoria} / ${item.subcategoria}`
        : item.categoria;
      return `
        <tr>
          <td>${escaparHtml(data)}</td>
          <td>${escaparHtml(catTexto)}</td>
          <td>${escaparHtml(item.nome)}</td>
          <td>R$ ${formatarValor(item.valor)}</td>
        </tr>
      `;
    })
    .join('');
}

document.addEventListener('DOMContentLoaded', () => {
  if ($('saldoAtual') || $('saldoCalculado')) {
    carregarResumo();

    const btn = $('btnProjecao');
    const fechar = $('fecharModal');

    if (btn) {
      btn.addEventListener('click', abrirProjecao);
    }

    if (fechar) {
      fechar.addEventListener('click', () => {
        hideElement($('modalProjecao'));
      });
    }
  }
});
