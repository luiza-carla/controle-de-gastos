import { apiFetch } from './config.js';
import {
  addClass,
  formatarValor,
  removeClass,
  setTextById,
  showElement,
  hideElement,
  $,
} from './helpers/index.js';
import { mostrarNotificacao } from './notification.js';

// Carrega resumo financeiro do mês
export async function carregarResumo() {
  try {
    const dados = await apiFetch(window.location.origin + '/resumo');

    setTextById('saldo', formatarValor(dados.saldo));
    setTextById('totalSalarios', formatarValor(dados.salarios));
    setTextById('saldoContas', formatarValor(dados.saldoContas));
    setTextById('saldoCarteira', formatarValor(dados.saldoCarteira || 0));
    setTextById('totalEntradas', formatarValor(dados.entradas));
    setTextById('totalSaidas', formatarValor(dados.saidas));
    setTextById('saldoFinal', formatarValor(dados.saldoFinal ?? dados.saldo));
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
// Somente ativa funcionalidades relacionadas ao resumo se o elemento
// que exibe o saldo final estiver presente na página. dessa forma não
// disparamos requisições desnecessárias em telas públicas (login/registro).
document.addEventListener('DOMContentLoaded', () => {
  if ($('saldoFinal')) {
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
