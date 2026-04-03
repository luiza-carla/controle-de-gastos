import { $ } from '../helpers/index.js';
import { fetchProjecao, fetchResumo } from './api.js';

export function createInicioState() {
  const els = {};
  let initialized = false;
  let resumo = null;
  let projecao = null;
  let filtrosResumo = {
    dataInicio: '',
    dataFim: '',
  };

  function initElements() {
    if (initialized) return els;

    Object.assign(els, {
      saldoAtual: $('saldoAtual'),
      saldoTituloTexto: $('saldoTituloTexto'),
      totalEntradas: $('totalEntradas'),
      totalSaidas: $('totalSaidas'),
      saldoCalculado: $('saldoCalculado'),
      saldoCalculadoLabel: $('saldoCalculadoLabel'),
      resumoPeriodoInfo: $('resumoPeriodoInfo'),
      detSaldoAtualLista: $('detSaldoAtualLista'),
      detEntradasLista: $('detEntradasLista'),
      detSaidasLista: $('detSaidasLista'),
      formFiltroResumo: $('formFiltroResumo'),
      filtroDataInicio: $('filtroDataInicio'),
      filtroDataFim: $('filtroDataFim'),
      btnLimparFiltroResumo: $('btnLimparFiltroResumo'),
      atalhosPeriodoResumo: Array.from(
        document.querySelectorAll('.btn-atalho-periodo')
      ),
      btnProjecao: $('btnProjecao'),
      modalProjecao: $('modalProjecao'),
      projSaldoAtual: $('projSaldoAtual'),
      projSaidasLabel: $('projSaidasLabel'),
      projSaidasPendentes: $('projSaidasPendentes'),
      projSaldoFinal: $('projSaldoFinal'),
      fecharModal: $('fecharModal'),
    });

    initialized = true;
    return els;
  }

  async function loadResumo() {
    const data = await fetchResumo(filtrosResumo);
    resumo = data;
    return data;
  }

  async function loadProjecao() {
    const data = await fetchProjecao(filtrosResumo);
    projecao = data;
    return data;
  }

  function setFiltrosResumo(novosFiltros = {}) {
    filtrosResumo = {
      dataInicio: novosFiltros.dataInicio || '',
      dataFim: novosFiltros.dataFim || '',
    };

    return filtrosResumo;
  }

  return {
    initElements,
    getEls: () => els,
    hasResumoElements: () => !!(els.saldoAtual || els.saldoCalculado),
    loadResumo,
    loadProjecao,
    getResumo: () => resumo,
    getProjecao: () => projecao,
    getFiltrosResumo: () => ({ ...filtrosResumo }),
    setFiltrosResumo,
  };
}
