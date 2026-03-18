import { apiFetch } from './config.js';
import {
  $,
  clearElement,
  setHTMLById,
  capitalizar,
  formatarData,
  formatarHora,
  formatarMoeda,
  onEventById,
  showElement,
  hideElement,
  escaparHtml,
  criarCardsHTML,
  criarPaginacao,
  criarBadgesCategoriaSubcategoriaSeparados,
} from './helpers/index.js';
import { mostrarNotificacao, tratarErro } from './notification.js';
import { abrirModalConfirmacao, fecharModal } from './modalDeletar.js';

// Estado da aplicação
let state = {
  historicos: [],
  filtros: {
    entidade: '',
    acao: '',
    desfeito: '',
    ordenarPor: 'data',
  },
};

const paginacaoHistorico = criarPaginacao({
  containerId: 'pagination',
  prevButtonId: 'btn-anterior',
  nextButtonId: 'btn-proximo',
  infoId: 'page-info',
  limit: 20,
  onChange: async () => {
    await carregarHistorico();
  },
});

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
  inicializarEventos();
  carregarHistorico();
});

function inicializarEventos() {
  onEventById('btn-aplicar-filtros', 'click', aplicarFiltros);
  onEventById('btn-limpar-filtros', 'click', limparFiltros);
  paginacaoHistorico.init();

  // Filtro automático ao mudar qualquer select
  ['filtro-entidade', 'filtro-acao', 'filtro-status', 'filtro-ordenar'].forEach(
    (id) => {
      const el = $(id);
      if (el) {
        el.addEventListener('change', aplicarFiltros);
      }
    }
  );

  // Delegação para botões de desfazer e toggles adicionados dinamicamente
  onEventById('historico-lista', 'click', async (event) => {
    // toggle sempre deve ser tratado antes do botão de desfazer, porque o
    // elemento pai (row) carregava `data-historico-id` e acabaria interceptando
    // o clique.
    const toggleBtn = event.target.closest('.alteracoes-toggle');
    if (toggleBtn) {
      toggleDropdownAlteracoes(toggleBtn);
      return;
    }

    const btn = event.target.closest('button[data-historico-id]');
    if (btn) {
      await desfazerAcao(btn.dataset.historicoId);
      return;
    }
  });
}

// Funções de API
async function carregarHistorico() {
  try {
    mostrarLoading(true);

    const { entidade, acao, desfeito, ordenarPor } = state.filtros;
    const { skip, limit } = paginacaoHistorico.getParams();

    const params = new URLSearchParams({
      skip: skip.toString(),
      limit: limit.toString(),
    });

    if (entidade) params.append('entidade', entidade);
    if (acao) params.append('acao', acao);
    if (desfeito !== '') params.append('desfeito', desfeito);
    if (ordenarPor) params.append('ordenarPor', ordenarPor);

    const resultado = await apiFetch(
      `${window.location.origin}/historico?${params}`
    );

    state.historicos = resultado.data || [];
    const total = resultado.pagination?.total || 0;
    const paginaAjustada = paginacaoHistorico.setTotal(total);

    if (paginaAjustada) {
      await paginacaoHistorico.notificarMudanca();
      return;
    }

    renderizarHistorico();
  } catch {
    mostrarNotificacao('Erro ao carregar histórico', 'erro');
  } finally {
    mostrarLoading(false);
  }
}

// Renderização
function renderizarHistorico() {
  const lista = $('historico-lista');
  const emptyState = $('empty-state');

  if (!lista) return;

  if (state.historicos.length === 0) {
    clearElement(lista);
    hideElement(lista);
    showElement(emptyState);
    return;
  }

  setHTMLById(
    'historico-lista',
    criarCardsHTML(state.historicos, criarItemHistorico)
  );
  showElement(lista);
  hideElement(emptyState);
}

function criarItemHistorico(historico) {
  const historicoId = escaparHtml(String(historico._id || ''));
  const classes = `historico-item acao-${historico.acao}${historico.desfeito ? ' historico-desfeito' : ''}`;

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
          <div class="historico-descricao">${escaparHtml(historico.descricao || '')}</div>
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

const CAMPOS_OCULTOS_ALTERACAO = new Set([
  '_id',
  '__v',
  'createdAt',
  'updatedAt',
  'usuario',
]);

const LABEL_CAMPO_ALTERACAO = {
  titulo: 'Título',
  valor: 'Valor',
  tipo: 'Tipo',
  categoria: 'Categoria',
  conta: 'Conta',
  status: 'Status',
  tipoDespesa: 'Tipo de despesa',
  recorrencia: 'Recorrência',
  fonteSaldo: 'Origem do saldo',
  tags: 'Tags',
  data: 'Data',
  'parcelamento.totalParcelas': 'Total de parcelas',
  'parcelamento.parcelaAtual': 'Parcela atual',
  ativa: 'Ativa',
  saldo: 'Saldo',
  nome: 'Nome',
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

const FORMATADORES_OBJETO = {
  transacao: formatarObjetoTransacao,
  conta: formatarObjetoConta,
  listaDesejo: formatarObjetoListaDesejo,
  salario: formatarObjetoTransacao,
  carteira: formatarObjetoCarteira,
};

// Renderiza o bloco de "Antes/Depois" apenas para ações de edição.
function gerarDetalhesEdicao(historico) {
  // somente histórico de edição exibe o botão, mas sempre mostramos o toggle
  // mesmo que não haja diferenças detectáveis; isso garante que o usuário
  // possa abrir/inspecionar mesmo quando o algoritmo não encontrou campos.
  if (historico.acao !== 'edicao') {
    return '';
  }

  const alteracoes = calcularAlteracoes(
    historico.dadosAnteriores,
    historico.dadosNovos
  );

  const quantidadeAlteracoes = alteracoes.length;
  const textoAlteracoes =
    quantidadeAlteracoes === 1
      ? '1 campo alterado'
      : `${quantidadeAlteracoes} campos alterados`;

  let itensHtml;
  if (quantidadeAlteracoes > 0) {
    itensHtml = alteracoes
      .map((alteracao) => {
        return `
        <div class="alteracao-item">
          <div class="alteracao-campo">${escaparHtml(alteracao.campo)}</div>
          <div class="alteracao-valores">
            <span class="alteracao-antes">Antes: ${escaparHtml(alteracao.antes)}</span>
            <span class="alteracao-depois">Depois: ${escaparHtml(alteracao.depois)}</span>
          </div>
        </div>
      `;
      })
      .join('');
  } else {
    itensHtml = `
      <div class="alteracao-item">
        <em>Nenhuma alteração visível</em>
      </div>
    `;
  }

  return `
    <div class="historico-alteracoes">
      <button class="alteracoes-toggle" type="button">
        <i class="fa-solid fa-chevron-right alteracoes-icone"></i>
        <span class="alteracoes-label">Ver alterações (${textoAlteracoes})</span>
      </button>
      <div class="alteracoes-conteudo" style="display: none;">
        ${itensHtml}
      </div>
    </div>
  `;
}

// Renderiza o objeto alterado (transação, conta, lista de desejo, etc.)
function gerarDetalhesObjeto(historico) {
  const { acao, entidade, objeto } = historico;
  const fontePrioritaria = FONTE_DADOS_PRIORITARIA_POR_ACAO[acao];
  const snapshot = fontePrioritaria ? historico[fontePrioritaria] : null;
  const objetoParaExibir = snapshot || objeto;

  if (!objetoParaExibir) {
    return '';
  }

  const titulo = TITULO_POR_ACAO_OBJETO[acao] || 'Objeto atual';

  return gerarDetalhesObjetoHtml({
    objeto: objetoParaExibir,
    entidade,
    titulo,
  });
}

// Gera HTML para exibir detalhes do objeto
function gerarDetalhesObjetoHtml({ objeto, entidade, titulo }) {
  if (!objeto) {
    return '';
  }

  const formatador = FORMATADORES_OBJETO[entidade];
  if (!formatador) {
    return '';
  }

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

function renderCampoObjeto(label, valor, escape = true) {
  if (valor === undefined || valor === null || valor === '') {
    return '';
  }

  const valorFormatado = escape ? escaparHtml(String(valor)) : String(valor);
  return `<div class="objeto-campo"><strong>${label}:</strong> ${valorFormatado}</div>`;
}

function obterNomeRelacionado(valor) {
  if (!valor) return '';
  if (typeof valor === 'object') return valor.nome || '';
  return '';
}

function formatarObjetoTransacao(transacao) {
  if (!transacao) {
    return '<div class="objeto-campo">Objeto não disponível</div>';
  }

  const conta = obterNomeRelacionado(transacao.conta);

  const campos = [];

  campos.push(renderCampoObjeto('Título', transacao.titulo));

  if (transacao.tipo) {
    campos.push(renderCampoObjeto('Tipo', capitalizar(transacao.tipo), false));
  }

  if (transacao.valor !== undefined && transacao.valor !== null) {
    campos.push(
      renderCampoObjeto('Valor', formatarMoeda(transacao.valor), false)
    );
  }

  // Categoria exibida sempre; subcategoria exibida se existir.
  if (transacao.categoria) {
    const { categoriaBadge, subcategoriaBadge } =
      criarBadgesCategoriaSubcategoriaSeparados(
        transacao.categoria,
        transacao.subcategoria
      );

    campos.push(renderCampoObjeto('Categoria', categoriaBadge, false));

    if (subcategoriaBadge) {
      campos.push(renderCampoObjeto('Subcategoria', subcategoriaBadge, false));
    }
  } else {
    campos.push(renderCampoObjeto('Categoria', '', false));
  }

  if (transacao.fonteSaldo === 'carteira') {
    campos.push(renderCampoObjeto('Conta', 'Carteira', false));
  } else if (conta) {
    campos.push(renderCampoObjeto('Conta', conta));
  }

  if (transacao.status) {
    campos.push(
      renderCampoObjeto('Status', capitalizar(transacao.status), false)
    );
  }

  if (transacao.data) {
    campos.push(renderCampoObjeto('Data', formatarData(transacao.data), false));
  }

  let detalhes = campos.filter(Boolean).join('');

  if (transacao.tags && transacao.tags.length > 0) {
    const tags = transacao.tags
      .map((tag) => `<span class="tag-badge">${escaparHtml(tag)}</span>`)
      .join(' ');
    detalhes += `<div class="objeto-campo"><strong>Tags:</strong> ${tags}</div>`;
  }

  return detalhes || '<div class="objeto-campo">Sem detalhes para exibir</div>';
}

function formatarObjetoConta(conta) {
  if (!conta) {
    return '<div class="objeto-campo">Objeto não disponível</div>';
  }

  const tipo =
    conta.tipo === 'corrente'
      ? 'Corrente'
      : conta.tipo === 'poupanca'
        ? 'Poupança'
        : 'Outro';
  const saldo = formatarMoeda(conta.saldo || 0);
  const ativa = conta.ativa ? 'Sim' : 'Não';

  return `
    ${renderCampoObjeto('Nome', conta.nome || '')}
    ${renderCampoObjeto('Tipo', tipo, false)}
    ${renderCampoObjeto('Saldo', saldo, false)}
    ${renderCampoObjeto('Ativa', ativa, false)}
  `;
}

function formatarObjetoListaDesejo(item) {
  if (!item) {
    return '<div class="objeto-campo">Objeto não disponível</div>';
  }

  const campos = [];

  campos.push(renderCampoObjeto('Título', item.titulo));

  if (item.preco !== undefined && item.preco !== null) {
    campos.push(renderCampoObjeto('Preço', formatarMoeda(item.preco), false));
  }

  // Categoria exibida sempre; subcategoria exibida se existir.
  if (item.categoria) {
    const { categoriaBadge, subcategoriaBadge } =
      criarBadgesCategoriaSubcategoriaSeparados(
        item.categoria,
        item.subcategoria
      );

    campos.push(renderCampoObjeto('Categoria', categoriaBadge, false));

    if (subcategoriaBadge) {
      campos.push(renderCampoObjeto('Subcategoria', subcategoriaBadge, false));
    }
  } else {
    campos.push(renderCampoObjeto('Categoria', '', false));
  }

  if (
    item.valorEconomizado !== undefined &&
    item.valorEconomizado !== null &&
    item.preco
  ) {
    const progresso = ((item.valorEconomizado / item.preco) * 100).toFixed(1);
    campos.push(
      renderCampoObjeto(
        'Economizado',
        `${formatarMoeda(item.valorEconomizado)} (${progresso}%)`,
        false
      )
    );
  }

  campos.push(renderCampoObjeto('Descrição', item.descricao));

  return (
    campos.filter(Boolean).join('') ||
    '<div class="objeto-campo">Sem detalhes para exibir</div>'
  );
}

function formatarObjetoCarteira(carteira) {
  if (!carteira) {
    return '<div class="objeto-campo">Objeto não disponível</div>';
  }

  const saldo = formatarMoeda(carteira.saldo || 0);

  return `
    ${renderCampoObjeto('Saldo', saldo, false)}
  `;
}

function toggleDropdownAlteracoes(toggleBtn) {
  const container = toggleBtn.closest('.historico-alteracoes');
  if (!container) return;

  const conteudo = container.querySelector('.alteracoes-conteudo');
  const icone = container.querySelector('.alteracoes-icone');
  const label = container.querySelector('.alteracoes-label');

  if (!conteudo) return;

  const isVisible = conteudo.style.display !== 'none';

  atualizarEstadoDropdownAlteracoes({
    conteudo,
    icone,
    label,
    aberto: !isVisible,
  });
}

function extrairResumoAlteracoes(labelText = '') {
  const match = labelText.match(/\((\d+ campos? alterados?)\)/);
  return match ? match[1] : '';
}

function atualizarEstadoDropdownAlteracoes({ conteudo, icone, label, aberto }) {
  if (!conteudo) return;

  conteudo.style.display = aberto ? 'block' : 'none';
  icone?.classList.toggle('alteracoes-icone-aberto', aberto);

  const resumo = extrairResumoAlteracoes(label?.textContent || '');
  if (!resumo || !label) return;

  label.textContent = aberto
    ? `Ocultar alterações (${resumo})`
    : `Ver alterações (${resumo})`;
}

function calcularAlteracoes(dadosAnteriores = {}, dadosNovos = {}) {
  // Achata objetos para comparar campos aninhados com a mesma estrutura de chave.
  const antes = achatarObjeto(dadosAnteriores);
  const depois = achatarObjeto(dadosNovos);

  const chaves = new Set([...Object.keys(antes), ...Object.keys(depois)]);
  const alteracoes = [];

  chaves.forEach((chave) => {
    const ultimaParte = chave.split('.').pop();
    if (CAMPOS_OCULTOS_ALTERACAO.has(ultimaParte)) {
      return;
    }

    const valorAntes = normalizarValorCampoAlteracao(
      chave,
      antes[chave],
      dadosAnteriores,
      dadosNovos
    );
    const valorDepois = normalizarValorCampoAlteracao(
      chave,
      depois[chave],
      dadosNovos,
      dadosAnteriores
    );

    if (valoresIguais(valorAntes, valorDepois)) {
      return;
    }

    alteracoes.push({
      campo: nomeCampo(chave),
      antes: formatarValorAlteracao(chave, valorAntes),
      depois: formatarValorAlteracao(chave, valorDepois),
    });
  });

  return alteracoes;
}

function normalizarValorCampoAlteracao(
  chave,
  valor,
  snapshotAtual,
  snapshotOutro
) {
  // Para categoria/conta, tenta resolver ID para nome usando ambos snapshots.
  if (!ehCampoReferencia(chave)) {
    return valor;
  }

  const nomeDireto = extrairNomeLegivel(valor);
  if (nomeDireto) {
    return nomeDireto;
  }

  const id = extrairIdReferencia(valor);
  if (!id) {
    return valor;
  }

  const valorMesmoSnapshot = obterValorPorCaminho(snapshotAtual, chave);
  const nomeMesmoSnapshot = extrairNomePorId(valorMesmoSnapshot, id);
  if (nomeMesmoSnapshot) {
    return nomeMesmoSnapshot;
  }

  const valorOutroSnapshot = obterValorPorCaminho(snapshotOutro, chave);
  const nomeOutroSnapshot = extrairNomePorId(valorOutroSnapshot, id);
  if (nomeOutroSnapshot) {
    return nomeOutroSnapshot;
  }

  return valor;
}

function ehCampoReferencia(chave) {
  const ultimaParte = chave.split('.').pop();
  return ultimaParte === 'categoria' || ultimaParte === 'conta';
}

function extrairIdReferencia(valor) {
  if (!valor) {
    return null;
  }

  if (typeof valor === 'string' && /^[a-f0-9]{24}$/i.test(valor)) {
    return valor;
  }

  if (
    typeof valor === 'object' &&
    Object.prototype.hasOwnProperty.call(valor, '_id')
  ) {
    return String(valor._id);
  }

  return null;
}

// Extrai um texto legível de objetos populados usados em campos de referência.
function extrairNomeLegivel(valor) {
  if (!valor || typeof valor !== 'object') {
    return null;
  }

  const nome = valor.nome || valor.titulo || valor.descricao;
  return nome ? String(nome) : null;
}

function extrairNomePorId(valor, idEsperado) {
  if (!valor || typeof valor !== 'object') {
    return null;
  }

  if (!Object.prototype.hasOwnProperty.call(valor, '_id')) {
    return extrairNomeLegivel(valor);
  }

  const idValor = String(valor._id);
  if (idValor !== idEsperado) {
    return null;
  }

  return extrairNomeLegivel(valor);
}

function obterValorPorCaminho(obj, caminho) {
  if (!obj || typeof obj !== 'object') {
    return undefined;
  }

  return caminho
    .split('.')
    .reduce((acumulador, parte) => acumulador?.[parte], obj);
}

function achatarObjeto(obj, prefixo = '') {
  if (!obj || typeof obj !== 'object') {
    return {};
  }

  const resultado = {};

  Object.entries(obj).forEach(([chave, valor]) => {
    const caminho = prefixo ? `${prefixo}.${chave}` : chave;

    if (valor instanceof Date || Array.isArray(valor) || valor === null) {
      resultado[caminho] = valor;
      return;
    }

    if (typeof valor === 'object') {
      // Quando vier documento populado, prioriza campo legível para exibição
      if (Object.prototype.hasOwnProperty.call(valor, '_id')) {
        resultado[caminho] =
          valor.nome || valor.titulo || valor.descricao || valor._id;
        return;
      }

      if (Object.keys(valor).length === 0) {
        resultado[caminho] = valor;
        return;
      }

      Object.assign(resultado, achatarObjeto(valor, caminho));
      return;
    }

    resultado[caminho] = valor;
  });

  return resultado;
}

function valoresIguais(a, b) {
  return (
    JSON.stringify(normalizarValorComparacao(a)) ===
    JSON.stringify(normalizarValorComparacao(b))
  );
}

function normalizarValorComparacao(valor) {
  // Normaliza tipos para evitar falso positivo de diferença (Date/ObjectId).
  if (valor instanceof Date) {
    return valor.toISOString();
  }

  if (Array.isArray(valor)) {
    return valor.map(normalizarValorComparacao);
  }

  if (valor && typeof valor === 'object') {
    if (Object.prototype.hasOwnProperty.call(valor, '_id')) {
      return valor._id;
    }

    return valor;
  }

  return valor;
}

function nomeCampo(chave) {
  if (LABEL_CAMPO_ALTERACAO[chave]) {
    return LABEL_CAMPO_ALTERACAO[chave];
  }

  const ultimaParte = chave.split('.').pop() || chave;
  if (LABEL_CAMPO_ALTERACAO[ultimaParte]) {
    return LABEL_CAMPO_ALTERACAO[ultimaParte];
  }

  return ultimaParte
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (letra) => letra.toUpperCase())
    .trim();
}

function formatarValorAlteracao(chave, valor) {
  if (valor === undefined || valor === null || valor === '') {
    return '-';
  }

  if (Array.isArray(valor)) {
    return valor.length ? valor.join(', ') : '-';
  }

  if (typeof valor === 'boolean') {
    return valor ? 'Sim' : 'Não';
  }

  if (typeof valor === 'number') {
    if (chave.includes('valor') || chave.includes('saldo')) {
      return formatarMoeda(valor);
    }

    return String(valor);
  }

  if (typeof valor === 'string' && chave.includes('data')) {
    const data = new Date(valor);
    if (!Number.isNaN(data.getTime())) {
      return formatarData(data);
    }
  }

  if (typeof valor === 'object') {
    if (valor.nome || valor.titulo || valor.descricao) {
      return String(valor.nome || valor.titulo || valor.descricao);
    }

    if (Object.prototype.hasOwnProperty.call(valor, '_id')) {
      return String(valor._id);
    }

    return JSON.stringify(valor);
  }

  return String(valor);
}

// Traduções usadas nos badges da UI.
function traduzirEntidade(entidade) {
  const traducoes = {
    transacao: 'Transação',
    conta: 'Conta',
    carteira: 'Carteira',
    salario: 'Salário',
    listaDesejo: 'Lista de Desejo',
  };
  return traducoes[entidade] || entidade;
}

function traduzirAcao(acao) {
  const traducoes = {
    criacao: 'Criação',
    edicao: 'Edição',
    delecao: 'Deleção',
    transferencia: 'Transferência',
    realizacao: 'Realização',
  };
  return traducoes[acao] || acao;
}

// Filtros
function aplicarFiltros() {
  const filtroEntidade = $('filtro-entidade');
  const filtroAcao = $('filtro-acao');
  const filtroStatus = $('filtro-status');

  state.filtros.entidade = filtroEntidade?.value || '';
  state.filtros.acao = filtroAcao?.value || '';
  state.filtros.desfeito = filtroStatus?.value || '';

  const filtroOrdenar = $('filtro-ordenar');
  state.filtros.ordenarPor = filtroOrdenar?.value || 'data';

  paginacaoHistorico.resetar();
  carregarHistorico();
}

function limparFiltros() {
  const filtroEntidade = $('filtro-entidade');
  const filtroAcao = $('filtro-acao');
  const filtroStatus = $('filtro-status');

  if (filtroEntidade) filtroEntidade.value = '';
  if (filtroAcao) filtroAcao.value = '';
  if (filtroStatus) filtroStatus.value = '';

  const filtroOrdenar = $('filtro-ordenar');
  if (filtroOrdenar) filtroOrdenar.value = 'data';

  state.filtros = { entidade: '', acao: '', desfeito: '', ordenarPor: 'data' };
  paginacaoHistorico.resetar();
  carregarHistorico();
}

// Loading
function mostrarLoading(mostrar) {
  const loading = $('loading');
  const lista = $('historico-lista');

  if (mostrar) {
    showElement(loading);
    hideElement(lista);
    return;
  }

  hideElement(loading);
}

// Desfazer ação
async function desfazerAcao(historicoId) {
  abrirModalConfirmacao({
    titulo: 'Desfazer ação',
    mensagem: 'Tem certeza que deseja desfazer esta ação?',
    onConfirmar: async () => {
      fecharModal();
      try {
        const resultado = await apiFetch(
          `${window.location.origin}/historico/${historicoId}/desfazer`,
          {
            method: 'POST',
          }
        );

        mostrarNotificacao(
          resultado.message || 'Ação desfeita com sucesso',
          'sucesso'
        );

        // Recarrega lista e estado visual após reversão.
        await carregarHistorico();
      } catch (error) {
        const msg = tratarErro(error, 'Erro ao desfazer ação');
        mostrarNotificacao(msg, 'erro');
      }
    },
  });
}
