import { $ } from '../helpers/index.js';
import { fetchProjecao, fetchResumo } from './api.js';

export function createInicioState() {
  const els = {};
  let initialized = false;
  let resumo = null;
  let projecao = null;

  function initElements() {
    if (initialized) return els;

    Object.assign(els, {
      saldoAtual: $('saldoAtual'),
      totalEntradas: $('totalEntradas'),
      totalSaidas: $('totalSaidas'),
      saldoCalculado: $('saldoCalculado'),
      detSaldoAtualLista: $('detSaldoAtualLista'),
      detEntradasLista: $('detEntradasLista'),
      detSaidasLista: $('detSaidasLista'),
      btnProjecao: $('btnProjecao'),
      modalProjecao: $('modalProjecao'),
      projSaldoAtual: $('projSaldoAtual'),
      projSaidasPendentes: $('projSaidasPendentes'),
      projSaldoFinal: $('projSaldoFinal'),
      fecharModal: $('fecharModal'),
    });

    initialized = true;
    return els;
  }

  async function loadResumo() {
    const data = await fetchResumo();
    resumo = data;
    return data;
  }

  async function loadProjecao() {
    const data = await fetchProjecao();
    projecao = data;
    return data;
  }

  return {
    initElements,
    getEls: () => els,
    hasResumoElements: () => !!(els.saldoAtual || els.saldoCalculado),
    loadResumo,
    loadProjecao,
    getResumo: () => resumo,
    getProjecao: () => projecao,
  };
}
