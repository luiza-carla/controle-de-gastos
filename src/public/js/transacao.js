import { apiFetch } from './config.js';
import { limparCategoriaSelecionada } from './categoria.js';
import {
  abrirModal,
  fecharModal,
  mostrarErroInline,
  limparErroInline,
  garantirErroInline,
  abrirModalErro,
} from './modalEditar.js';
import { abrirModalConfirmacao } from './modalDeletar.js';
import {
  mostrarNotificacao,
  persistirNotificacaoParaProximaTela,
} from './notification.js';
import {
  formatarValor,
  formatarData,
  capitalizar,
  criarBotoesAcao,
  showElement,
  hideElement,
  $,
  escaparHtml,
  criarBadgeCategoria,
  inicializarTags,
  gerarTags,
  inicializarEditorTags,
  resetarTagsFormulario,
  setupCategoriaAutocomplete,
  criarPaginacao,
  // filtro/pagina
  filtrarPorCategoria,
  renderizarListagemFiltrada,
  inicializarFiltroCategoriaGenerico,
  aplicarFiltroCategoriaGenerico,
  limparFiltroCategoriaGenerico,
} from './helpers/index.js';
const FORM_ERRO_ID = 'formErroInlineTransacao';
const FORM_MSG_ERRO_ID = 'formMensagemErroTransacao';

const stateTransacoes = {
  itens: [],
  filtroCategoriaId: '', // id selecionado no filtro de categoria
  filtroInicializado: false,
  categoriaAutocompleteFiltro: null,
};
let tags = [];

const paginacaoTransacoes = criarPaginacao({
  containerId: 'paginationTransacoes',
  prevButtonId: 'btnAnteriorTransacoes',
  nextButtonId: 'btnProximoTransacoes',
  infoId: 'pageInfoTransacoes',
  limit: 10,
  onChange: async () => {
    renderizarPaginaTransacoes();
  },
});

const URL_TRANSACOES = `${window.location.origin}/transacoes`;
const URL_CATEGORIAS = `${window.location.origin}/categorias`;
const URL_CONTAS = `${window.location.origin}/contas`;

function mostrarErroApi(erro, mensagemPadrao) {
  mostrarNotificacao(erro.message || mensagemPadrao, 'erro');
}

async function carregarTransacoes() {
  return apiFetch(URL_TRANSACOES);
}

function resetarFormularioTransacao(
  form,
  tipoDespesaSelect,
  parcelasContainer
) {
  resetarTagsFormulario(tags);
  form.reset();
  hideElement($('tipoDespesaContainer'));
  tipoDespesaSelect.value = '';
  hideElement(parcelasContainer);
  limparCategoriaSelecionada();
}

// Inicializa envio do formulario de transacao
export async function criarTransacao(formId = 'formTransacao') {
  const form = $(formId);
  const tipoSelect = $('tipo');
  const tipoDespesaSelect = $('tipoDespesaContainer')?.querySelector(
    '#tipoDespesa'
  );
  if (form) form.noValidate = true;
  garantirErroInline(form, FORM_ERRO_ID, FORM_MSG_ERRO_ID);
  const recorrenciaSelect = $('recorrencia');
  const parcelasContainer = $('parcelasContainer');

  // Controla exibicao de campos condicionais
  tipoSelect?.addEventListener('change', () => {
    if (tipoSelect.value === 'saida') {
      showElement($('tipoDespesaContainer'));
    } else {
      hideElement($('tipoDespesaContainer'));
      tipoDespesaSelect.value = '';
    }
  });

  recorrenciaSelect?.addEventListener('change', () => {
    if (recorrenciaSelect.value === 'nenhuma') {
      hideElement(parcelasContainer);
    } else {
      showElement(parcelasContainer);
    }
  });

  // Envia dados da transacao para API
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    limparErroInline(FORM_ERRO_ID, FORM_MSG_ERRO_ID);

    const botaoClicado = e.submitter;
    const acao = botaoClicado?.getAttribute('data-action');
    const tituloTransacao = form.titulo.value;

    const conta = $('conta')?.value;
    const categoria = $('categoria')?.value;
    const tipoDespesa =
      tipoSelect.value === 'saida' ? tipoDespesaSelect.value : null;
    const valor = Number(form.valor.value);

    if (
      !tituloTransacao ||
      !valor ||
      !tipoSelect.value ||
      !conta ||
      !categoria
    ) {
      abrirModalErro(
        'Por favor, preencha todos os campos obrigatórios',
        FORM_ERRO_ID,
        FORM_MSG_ERRO_ID
      );
      return;
    }

    if (!form.status.value) {
      mostrarErroInline(
        'Por favor, selecione um status',
        FORM_ERRO_ID,
        FORM_MSG_ERRO_ID
      );
      return;
    }

    try {
      await apiFetch(URL_TRANSACOES, {
        method: 'POST',
        body: JSON.stringify({
          titulo: tituloTransacao,
          valor,
          tipo: tipoSelect.value,
          tipoDespesa,
          conta: conta,
          categoria: categoria,
          status: form.status.value,
          recorrencia: form.recorrencia.value,
          tags: [...tags],
          parcelamento: {
            totalParcelas: Number(form.totalParcelas.value || 1),
            parcelaAtual: Number(form.parcelaAtual.value || 1),
          },
        }),
      });

      if (acao === 'salvar-adicionar-outro') {
        mostrarNotificacao(
          `Transação "${tituloTransacao}" adicionada com sucesso!`
        );
        resetarFormularioTransacao(form, tipoDespesaSelect, parcelasContainer);
      } else if (window.location.pathname.includes('adicionar-transacao')) {
        persistirNotificacaoParaProximaTela(
          `Transação "${tituloTransacao}" adicionada com sucesso!`
        );
        window.location.href = '/html/transacoes.html';
      } else {
        mostrarNotificacao(
          `Transação "${tituloTransacao}" adicionada com sucesso!`
        );
        resetarFormularioTransacao(form, tipoDespesaSelect, parcelasContainer);
        listarTransacoes();
      }
    } catch (erro) {
      mostrarNotificacao(erro.message || 'Erro ao criar transação', 'erro');
    }
  });
}

// Lista transacoes do usuario na tela
function renderizarPaginaTransacoes() {
  const fnTotal = (t) =>
    t.tipo === 'saida' ? -Number(t.valor || 0) : Number(t.valor || 0);

  renderizarListagemFiltrada(
    'transacoes',
    stateTransacoes.itens,
    () =>
      filtrarPorCategoria(
        stateTransacoes.itens,
        stateTransacoes.filtroCategoriaId
      ),
    criarCardTransacao,
    paginacaoTransacoes,
    'totalTransacoes',
    fnTotal
  );
}

function aplicarFiltroCategoria() {
  aplicarFiltroCategoriaGenerico(
    stateTransacoes,
    'filtroCategoriaTransacao',
    renderizarPaginaTransacoes,
    paginacaoTransacoes
  );
}

function limparFiltroCategoria() {
  limparFiltroCategoriaGenerico(
    stateTransacoes,
    paginacaoTransacoes,
    renderizarPaginaTransacoes
  );
}
export async function listarTransacoes() {
  const container = $('transacoes');
  // Gera HTML de um card de transacao
  if (!container) return;

  try {
    await inicializarFiltroCategoria();

    const transacoes = await carregarTransacoes();
    stateTransacoes.itens = transacoes || [];

    renderizarPaginaTransacoes();
  } catch (erro) {
    // se houver erro (tipicamente não autorizado), mostra notificação
    mostrarNotificacao(erro.message || 'Erro ao carregar transações', 'erro');
  }
}

async function inicializarFiltroCategoria() {
  $('btnLimparFiltroCategoriaTransacao')?.addEventListener(
    'click',
    limparFiltroCategoria
  );
  if (stateTransacoes.filtroInicializado) {
    return;
  }

  const inputBusca = $('filtroBuscaCategoriaTransacao');
  const inputHidden = $('filtroCategoriaTransacao');
  const dropdown = $('filtroDropdownCategoriaTransacao');

  if (!inputBusca || !inputHidden || !dropdown) {
    return;
  }
  await inicializarFiltroCategoriaGenerico({
    inputBuscaId: 'filtroBuscaCategoriaTransacao',
    inputHiddenId: 'filtroCategoriaTransacao',
    dropdownId: 'filtroDropdownCategoriaTransacao',
    btnLimparId: 'btnLimparFiltroCategoriaTransacao',
    urlCategorias: URL_CATEGORIAS,
    stateObj: stateTransacoes,
    aplicarFiltroFn: aplicarFiltroCategoria,
    limparFiltroFn: limparFiltroCategoria,
  });

  stateTransacoes.filtroInicializado = true;
}
function criarCardTransacao(t) {
  const tipoClasse =
    t.tipo === 'entrada' ? 'transacao-entrada' : 'transacao-saida';

  const tipoCapitalizado = capitalizar(t.tipo);
  const tipoDespesaCapitalizado = t.tipoDespesa
    ? capitalizar(t.tipoDespesa)
    : '';
  const recorrenciaCapitalizada =
    t.recorrencia && t.recorrencia.toLowerCase() !== 'nenhuma'
      ? capitalizar(t.recorrencia)
      : '';
  const statusCapitalizado = capitalizar(t.status);

  const temRecorrencia =
    t.recorrencia && t.recorrencia.toLowerCase() !== 'nenhuma';

  const valorFormatado = formatarValor(t.valor);

  const conta =
    t.fonteSaldo === 'carteira'
      ? 'Carteira (dinheiro físico)'
      : t.conta?.nome || 'Sem conta';
  const categoria = criarBadgeCategoria(t.categoria);
  const corCategoria = t.categoria?.cor || 'var(--gray-700)';

  const tags = gerarTags(t.tags);
  const dataCriacao = formatarData(t.createdAt || t.data);

  const parcelaAtual = t.parcelamento?.parcelaAtual || 1;
  const totalParcelas = t.parcelamento?.totalParcelas || 1;

  return `
    <div class="transacao-card ${tipoClasse}" style="--cor-categoria:${corCategoria};">

      <div class="transacao-header">
        <div class="transacao-titulo">
          ${escaparHtml(t.titulo)}
        </div>
        <div class="transacao-valor ${tipoClasse}">
          R$ ${valorFormatado}
        </div>
      </div>

      <div class="transacao-corpo">
        <div class="transacao-info-grid">
          
          <div class="info-linha">
            <span class="info-label">Tipo:</span>
            <span class="info-valor info-valor-tipo">
              <span class="tipo-chip tipo-chip-${t.tipo}">${tipoCapitalizado}</span>
              ${
                tipoDespesaCapitalizado
                  ? `<span class="tipo-chip tipo-chip-despesa">${tipoDespesaCapitalizado}</span>`
                  : ''
              }
            </span>
          </div>

          <div class="info-linha">
            <span class="info-label">Categoria:</span>
            <span class="info-valor">${categoria}</span>
          </div>

          <div class="info-linha">
            <span class="info-label">Conta:</span>
            <span class="info-valor">${escaparHtml(conta)}</span>
          </div>

          <div class="info-linha">
            <span class="info-label">Status:</span>
            <span class="info-valor">${statusCapitalizado}</span>
          </div>

          <div class="info-linha">
            <span class="info-label">Criada em:</span>
            <span class="info-valor">${dataCriacao}</span>
          </div>

          ${
            temRecorrencia
              ? `<div class="info-linha">
            <span class="info-label">Recorrência:</span>
            <span class="info-valor">${recorrenciaCapitalizada}</span>
          </div>`
              : ''
          }

          ${
            temRecorrencia
              ? `<div class="info-linha">
            <span class="info-label">Parcela:</span>
            <span class="info-valor">${parcelaAtual}/${totalParcelas}</span>
          </div>`
              : ''
          }
        </div>

        ${
          tags
            ? `<div class="transacao-tags">
          ${tags}
        </div>`
            : ''
        }
      </div>

      <div class="transacao-acoes">
        ${criarBotoesAcao([
          {
            classe: 'secondary',
            onclick: `editarTransacao('${t._id}')`,
            icone: 'fa-pen',
            title: 'Editar',
          },
          {
            classe: 'danger',
            onclick: `deletarTransacao('${t._id}')`,
            icone: 'fa-trash',
            title: 'Deletar',
          },
        ])}
      </div>

    </div>
  `;
}

// Abre modal para edicao de transacao
window.editarTransacao = async (id) => {
  const transacao = (await carregarTransacoes()).find((t) => t._id === id);
  const categorias = await apiFetch(URL_CATEGORIAS);
  const contas = await apiFetch(URL_CONTAS);

  if (!transacao) return;

  let tagsModal = [...(transacao.tags || [])];

  const tipoDespesaField = `
    <div class="form-group" id="modalGrupoTipoDespesa" style="display: ${transacao.tipo === 'saida' ? '' : 'none'};">
      <label>Tipo de Despesa</label>
      <select id="modalTipoDespesa">
        <option value="">Selecione o tipo de despesa</option>
        <option value="essencial" ${transacao.tipoDespesa === 'essencial' ? 'selected' : ''}>Essencial</option>
        <option value="eventual" ${transacao.tipoDespesa === 'eventual' ? 'selected' : ''}>Eventual</option>
        <option value="opcional" ${transacao.tipoDespesa === 'opcional' ? 'selected' : ''}>Opcional</option>
      </select>
    </div>
  `;

  const destinoAtual =
    transacao.fonteSaldo === 'carteira' ? 'carteira' : transacao.conta?._id;

  const optionsContas = (contas || [])
    .map((conta) => {
      const selecionada = conta._id === destinoAtual ? 'selected' : '';
      return `<option value="${conta._id}" ${selecionada}>${escaparHtml(conta.nome)} (${escaparHtml(conta.tipo)})</option>`;
    })
    .join('');

  const carteiraSelecionada = destinoAtual === 'carteira' ? 'selected' : '';

  abrirModal({
    titulo: 'Editar transação',
    conteudoHTML: `
      <div class="form-group">
        <label>Título</label>
        <input type="text" id="modalTituloTransacao" value="${escaparHtml(transacao.titulo)}" required>
      </div>
      <div class="form-group">
        <label>Valor</label>
        <input type="number" id="modalValorTransacao" value="${transacao.valor}" step="0.01" required>
      </div>
      <div class="form-group">
        <label>Tipo</label>
        <select id="modalTipoTransacao" required>
          <option value="entrada" ${transacao.tipo === 'entrada' ? 'selected' : ''}>Entrada</option>
          <option value="saida" ${transacao.tipo === 'saida' ? 'selected' : ''}>Saída</option>
        </select>
      </div>
      <div class="form-group">
        <label>Status</label>
        <select id="modalStatusTransacao" required>
          <option value="pago" ${transacao.status === 'pago' ? 'selected' : ''}>Pago</option>
          <option value="pendente" ${transacao.status === 'pendente' ? 'selected' : ''}>Pendente</option>
        </select>
      </div>
      <div class="form-group">
        <label>Conta ou carteira</label>
        <select id="modalContaTransacao" required>
          <option value="" disabled ${!destinoAtual ? 'selected' : ''}>Selecione a conta ou carteira</option>
          <option value="carteira" ${carteiraSelecionada}>Carteira (dinheiro físico)</option>
          ${optionsContas}
        </select>
      </div>
      <div class="form-group">
        <label>Categoria</label>
         <div class="categoria-autocomplete">
           <input type="text" id="modalBuscaCategoriaTransacao" placeholder="Buscar categoria..." autocomplete="off" required>
           <input type="hidden" id="modalCategoriaTransacao" required>
           <div id="modalDropdownCategoriaTransacao" class="dropdown-categorias"></div>
         </div>
      </div>
      <div class="form-group">
        <label>Tags</label>
        <div id="modalTagsContainer" class="tag-editor-container"></div>
        <div class="tag-editor-input-row">
          <input type="text" id="modalTagInput" class="tag-editor-input" placeholder="Adicionar tag">
          <button type="button" id="modalBtnAddTag" class="btn btn-tag-add">
            <i class="fa-solid fa-plus"></i>
          </button>
        </div>
      </div>
      ${tipoDespesaField}
    `,
    onSalvar: async () => {
      limparErroInline();

      const novoTitulo = $('modalTituloTransacao')?.value?.trim();
      const novoValor = Number($('modalValorTransacao')?.value);
      const novoTipo = $('modalTipoTransacao')?.value;
      const novoStatus = $('modalStatusTransacao')?.value;
      const novaConta = $('modalContaTransacao')?.value;
      const novaCategoria = $('modalCategoriaTransacao')?.value;
      const novoTipoDespesa = $('modalTipoDespesa')?.value;

      if (
        !novoTitulo ||
        !novoValor ||
        !novoTipo ||
        !novoStatus ||
        !novaConta ||
        !novaCategoria
      ) {
        mostrarErroInline('Por favor, preencha todos os campos obrigatórios');
        return;
      }

      const dados = {
        titulo: novoTitulo,
        valor: novoValor,
        tipo: novoTipo,
        status: novoStatus,
        conta: novaConta,
        categoria: novaCategoria,
        tags: tagsModal,
      };

      if (novoTipo === 'saida') {
        dados.tipoDespesa = novoTipoDespesa || undefined;
      }

      try {
        await apiFetch(`${URL_TRANSACOES}/${id}`, {
          method: 'PUT',
          body: JSON.stringify(dados),
        });

        fecharModal();
        listarTransacoes();
      } catch (erro) {
        mostrarErroInline(erro.message || 'Erro ao atualizar transação');
      }
    },
  });

  inicializarEditorTags({
    tags: tagsModal,
    containerId: 'modalTagsContainer',
    inputId: 'modalTagInput',
    addButtonId: 'modalBtnAddTag',
  });

  setupCategoriaAutocomplete(
    'modalBuscaCategoriaTransacao',
    'modalCategoriaTransacao',
    'modalDropdownCategoriaTransacao',
    categorias
  );

  if (transacao.categoria) {
    const inputBusca = $('modalBuscaCategoriaTransacao');
    const inputHidden = $('modalCategoriaTransacao');
    if (inputBusca && inputHidden) {
      inputBusca.value = transacao.categoria.nome;
      inputHidden.value = transacao.categoria._id;
      const cor = transacao.categoria.cor || '';
      inputBusca.style.boxShadow = cor ? `inset 4px 0 0 ${cor}` : '';
    }
  }

  const selectTipo = $('modalTipoTransacao');
  const despField = $('modalGrupoTipoDespesa');
  if (selectTipo && despField) {
    const toggle = () => {
      if (selectTipo.value === 'saida') {
        showElement(despField);
      } else {
        hideElement(despField);
      }
    };
    selectTipo.addEventListener('change', toggle);
    toggle();
  }
};

window.deletarTransacao = async (id) => {
  abrirModalConfirmacao({
    titulo: 'Confirmar exclusão',
    mensagem: 'Tem certeza que deseja deletar esta transação?',
    onConfirmar: async () => {
      try {
        await apiFetch(`${URL_TRANSACOES}/${id}`, {
          method: 'DELETE',
        });
        fecharModal();
        listarTransacoes();
      } catch (err) {
        mostrarErroApi(err, 'Erro ao deletar transação');
      }
    },
  });
};

document.addEventListener('DOMContentLoaded', () => {
  paginacaoTransacoes.init();

  if ($('formTransacao')) {
    inicializarTags(tags);
  }
});
