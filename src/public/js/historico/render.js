import {
  criarCardsHTML,
  setHTMLById,
  showElement,
  hideElement,
  escaparHtml,
  formatarData,
  formatarHora,
} from '../helpers/index.js';
import { traduzirAcao, traduzirEntidade } from './labels.js';
import { calcularAlteracoes } from './diff.js';
import {
  formatarObjetoCarteira,
  formatarObjetoConta,
  formatarObjetoListaDesejo,
  formatarObjetoTransacao,
} from './formatters.js';

const FORMATADORES_OBJETO = {
  transacao: formatarObjetoTransacao,
  conta: formatarObjetoConta,
  listaDesejo: formatarObjetoListaDesejo,
  salario: formatarObjetoTransacao,
  carteira: formatarObjetoCarteira,
};

const TITULO_POR_ACAO_OBJETO = {
  criacao: 'Objeto criado',
  edicao: 'Objeto editado',
  delecao: 'Objeto deletado',
  realizacao: 'Objeto realizado',
  transferencia: 'Transferência',
};

const FONTE_DADOS_PRIORITARIA_POR_ACAO = {
  criacao: 'dadosNovos',
  edicao: 'dadosNovos',
  delecao: 'dadosAnteriores',
};

export function criarControladorHistorico({
  containerId = 'historico-lista',
  emptyStateId = 'empty-state',
  onDesfazer,
  onAlternarAlteracoes = alternarDetalhesAlteracoes,
} = {}) {
  let inicializado = false;

  function obterElementos() {
    return {
      lista: document.getElementById(containerId),
      emptyState: document.getElementById(emptyStateId),
    };
  }

  async function aoClicarNaLista(event) {
    const toggleBtn = event.target.closest('.alteracoes-toggle');
    if (toggleBtn) {
      onAlternarAlteracoes(toggleBtn);
      return;
    }

    const btn = event.target.closest('button[data-historico-id]');
    if (btn && typeof onDesfazer === 'function') {
      await onDesfazer(btn.dataset.historicoId);
    }
  }

  function init() {
    if (inicializado) return;

    const { lista } = obterElementos();
    if (!lista) return;

    lista.addEventListener('click', aoClicarNaLista);
    inicializado = true;
  }

  function render(historicos = []) {
    const { lista, emptyState } = obterElementos();

    if (!lista) return;

    if (!Array.isArray(historicos) || historicos.length === 0) {
      setHTMLById(containerId, '');
      hideElement(lista);
      showElement(emptyState);
      return;
    }

    setHTMLById(containerId, criarCardsHTML(historicos, criarItemHistorico));
    showElement(lista);
    hideElement(emptyState);
  }

  return {
    init,
    render,
  };
}

export function renderHistoricoLista(historicos = []) {
  return criarControladorHistorico().render(historicos);
}

export function criarItemHistorico(historico) {
  const historicoId = String(historico._id || '');
  const classes = `historico-item acao-${historico.acao}${
    historico.desfeito ? ' historico-desfeito' : ''
  }`;

  const dataFormatada = formatarData(historico.createdAt);
  const horaFormatada = formatarHora(historico.createdAt);

  const entidadeLabel = traduzirEntidade(historico.entidade);
  const acaoLabel = traduzirAcao(historico.acao);

  const btnDesfazer = !historico.desfeito
    ? `<button class="btn btn-success" data-historico-id="${historicoId}">
         <i class="fa-solid fa-rotate-left"></i> Desfazer
       </button>`
    : '<span class="badge-desfeito">Desfeito</span>';

  const detalhesEdicaoHtml = gerarDetalhesEdicao(historico);
  const detalhesObjetoHtml = gerarDetalhesObjeto(historico);

  return `
    <div class="${classes}">
      <div class="historico-item-header">
        <div class="historico-item-info">
          <div class="historico-descricao">${escaparHtml(
            historico.descricao || ''
          )}</div>
          <div class="historico-meta">
            <span>${dataFormatada} às ${horaFormatada}</span>
          </div>
        </div>
        <div class="historico-actions">
          <span class="historico-badge badge-${historico.acao}">${acaoLabel}</span>
          <span class="historico-badge badge-entidade">${entidadeLabel}</span>
          ${btnDesfazer}
        </div>
      </div>
      ${detalhesObjetoHtml}
      ${detalhesEdicaoHtml}
    </div>
  `;
}

export function gerarDetalhesEdicao(historico) {
  if (historico.acao !== 'edicao') return '';

  const alteracoes = calcularAlteracoes(
    historico.dadosAnteriores,
    historico.dadosNovos
  );

  const quantidadeAlteracoes = alteracoes.length;
  const textoAlteracoes =
    quantidadeAlteracoes === 1
      ? '1 campo alterado'
      : `${quantidadeAlteracoes} campos alterados`;

  const itensHtml =
    quantidadeAlteracoes > 0
      ? alteracoes
          .map((alteracao) => {
            return `
        <div class="alteracao-item">
          <div class="alteracao-campo">${escaparHtml(alteracao.campo)}</div>
          <div class="alteracao-valores">
            <span class="alteracao-antes">Antes: ${escaparHtml(
              alteracao.antes
            )}</span>
            <span class="alteracao-depois">Depois: ${escaparHtml(
              alteracao.depois
            )}</span>
          </div>
        </div>
      `;
          })
          .join('')
      : `
      <div class="alteracao-item">
        <em>Nenhuma alteração visível</em>
      </div>
    `;

  return `
    <div class="historico-alteracoes">
      <button class="alteracoes-toggle" type="button">
        <i class="fa-solid fa-chevron-right alteracoes-icone"></i>
        <span class="alteracoes-label">Ver alterações (${textoAlteracoes})</span>
      </button>
      <div class="alteracoes-conteudo">
        ${itensHtml}
      </div>
    </div>
  `;
}

export function gerarDetalhesObjeto(historico) {
  const { acao, entidade, objeto } = historico;
  const fontePrioritaria = FONTE_DADOS_PRIORITARIA_POR_ACAO[acao];
  const snapshot = fontePrioritaria ? historico[fontePrioritaria] : null;
  const objetoParaExibir = snapshot || objeto;

  if (!objetoParaExibir) return '';

  const titulo = TITULO_POR_ACAO_OBJETO[acao] || 'Objeto atual';

  return gerarDetalhesObjetoHtml({
    objeto: objetoParaExibir,
    entidade,
    titulo,
  });
}

function gerarDetalhesObjetoHtml({ objeto, entidade, titulo }) {
  if (!objeto) return '';

  const formatador = FORMATADORES_OBJETO[entidade];
  if (!formatador) return '';

  const conteudoHtml = formatador(objeto);

  return `
    <div class="historico-objeto">
      <div class="historico-objeto-titulo">${escaparHtml(titulo)}</div>
      <div class="historico-objeto-conteudo">
        ${conteudoHtml}
      </div>
    </div>
  `;
}

export function alternarDetalhesAlteracoes(toggleBtn) {
  const container = toggleBtn.closest('.historico-alteracoes');
  if (!container) return;

  const conteudo = container.querySelector('.alteracoes-conteudo');
  const icone = container.querySelector('.alteracoes-icone');
  const label = container.querySelector('.alteracoes-label');

  if (!conteudo) return;

  const aberto = !conteudo.classList.contains('aberto');
  atualizarEstadoDropdownAlteracoes({ conteudo, icone, label, aberto });
}

function extrairResumoAlteracoes(labelText = '') {
  const match = labelText.match(/\((\d+ campos? alterados?)\)/);
  return match ? match[1] : '';
}

function atualizarEstadoDropdownAlteracoes({ conteudo, icone, label, aberto }) {
  if (!conteudo) return;

  conteudo.classList.toggle('aberto', aberto);
  icone?.classList.toggle('alteracoes-icone-aberto', aberto);

  const resumo = extrairResumoAlteracoes(label?.textContent || '');
  if (!resumo || !label) return;

  label.textContent = aberto
    ? `Ocultar alterações (${resumo})`
    : `Ver alterações (${resumo})`;
}
