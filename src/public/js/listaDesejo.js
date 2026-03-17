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
  capitalizar,
  criarBotoesAcao,
  $,
  escaparHtml,
  criarBadgesCategoriaSubcategoriaSeparados,
  inicializarTags,
  gerarTags,
  inicializarEditorTags,
  resetarTagsFormulario,
  setupCategoriaAutocomplete,
  carregarSubcategorias,
  setupSubcategoriaAutocomplete,
  obterSubcategoriaParaEnviar,
  criarPaginacao,
  // filtros
  filtrarPorCategoria,
  renderizarListagemFiltrada,
  inicializarFiltroCategoriaGenerico,
  aplicarFiltroCategoriaGenerico,
  limparFiltroCategoriaGenerico,
  parseCurrency,
} from './helpers/index.js';

// Array para armazenar tags temporárias do formulário
let tags = [];

const URL_LISTA_DESEJOS = `${window.location.origin}/lista-desejos`;
const URL_CATEGORIAS = `${window.location.origin}/categorias`;
const URL_CONTAS = `${window.location.origin}/contas`;
const FORM_ERRO_ID = 'formErroInlineListaDesejo';
const FORM_MSG_ERRO_ID = 'formMensagemErroListaDesejo';

const stateDesejos = {
  itens: [],
  filtroCategoriaId: '',
  filtroInicializado: false,
  categoriaAutocompleteFiltro: null,
};

const paginacaoDesejos = criarPaginacao({
  containerId: 'paginationDesejos',
  prevButtonId: 'btnAnteriorDesejos',
  nextButtonId: 'btnProximoDesejos',
  infoId: 'pageInfoDesejos',
  limit: 10,
  onChange: async () => {
    renderizarPaginaDesejos();
  },
});

async function carregarDesejos() {
  return apiFetch(URL_LISTA_DESEJOS);
}

function resetarFormularioDesejo(form) {
  resetarTagsFormulario(tags);
  form.reset();
  limparCategoriaSelecionada();
  if ($('subcategoria')) $('subcategoria').value = '';
}

// Inicializa e gerencia envio do formulário de criação de desejo
export async function criarDesejo(formId = 'formListaDesejo') {
  const form = $(formId);
  if (!form) return;

  const inputCategoria = $('buscaCategoria');
  const inputSubcategoria = $('buscaSubcategoria');

  form.noValidate = true;
  garantirErroInline(form, FORM_ERRO_ID, FORM_MSG_ERRO_ID);

  inputCategoria?.addEventListener('input', () => {
    if (inputSubcategoria) inputSubcategoria.value = '';
    if ($('subcategoria')) $('subcategoria').value = '';
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    limparErroInline(FORM_ERRO_ID, FORM_MSG_ERRO_ID);

    const botaoClicado = e.submitter;
    const acao = botaoClicado?.getAttribute('data-action');
    const tituloDesejo = form.titulo.value;

    const categoria = $('categoria')?.value;
    const tipoDespesa = $('tipoDespesa')?.value;
    const valor = parseCurrency(form.valor.value);

    // Valida que categoria foi selecionada (campo obrigatório)
    if (!tituloDesejo || !valor) {
      abrirModalErro(
        'Por favor, preencha todos os campos obrigatórios',
        FORM_ERRO_ID,
        FORM_MSG_ERRO_ID
      );
      return;
    }

    if (!categoria) {
      mostrarErroInline(
        'Por favor, selecione uma categoria',
        FORM_ERRO_ID,
        FORM_MSG_ERRO_ID
      );
      return;
    }

    try {
      // Envia dados do desejo para API
      await apiFetch(URL_LISTA_DESEJOS, {
        method: 'POST',
        body: JSON.stringify({
          titulo: tituloDesejo,
          valor: parseCurrency(form.valor.value),
          categoria,
          subcategoria: obterSubcategoriaParaEnviar(
            'buscaSubcategoria',
            'subcategoria'
          ),
          tipoDespesa: tipoDespesa || undefined,
          tags: [...tags],
        }),
      });

      if (acao === 'salvar-adicionar-outro') {
        mostrarNotificacao(`Desejo "${tituloDesejo}" adicionado com sucesso!`);
        resetarFormularioDesejo(form);
      } else if (window.location.pathname.includes('adicionar-lista-desejo')) {
        persistirNotificacaoParaProximaTela(
          `Desejo "${tituloDesejo}" adicionado com sucesso!`
        );
        window.location.href = '/html/lista-desejos.html';
      } else {
        mostrarNotificacao(`Desejo "${tituloDesejo}" adicionado com sucesso!`);
        resetarFormularioDesejo(form);
        listarDesejos();
      }
    } catch (erro) {
      mostrarNotificacao(erro.message || 'Erro ao criar desejo', 'erro');
    }
  });
}

// Lista todos os desejos do usuario e renderiza na tela
export async function listarDesejos() {
  const container = $('listaDesejos');
  if (!container) return;

  try {
    await inicializarFiltroCategoriaDesejo();

    const desejos = await carregarDesejos();
    stateDesejos.itens = desejos || [];

    renderizarPaginaDesejos();
  } catch (erro) {
    mostrarNotificacao(erro.message || 'Erro ao carregar desejos', 'erro');
  }
}

function renderizarPaginaDesejos() {
  renderizarListagemFiltrada(
    'listaDesejos',
    stateDesejos.itens,
    () =>
      filtrarPorCategoria(stateDesejos.itens, stateDesejos.filtroCategoriaId),
    criarCardDesejo,
    paginacaoDesejos,
    'totalDesejos'
  );
}

function aplicarFiltroCategoriaDesejo() {
  aplicarFiltroCategoriaGenerico(
    stateDesejos,
    'filtroCategoriaDesejo',
    renderizarPaginaDesejos,
    paginacaoDesejos
  );
}

function limparFiltroCategoriaDesejo() {
  limparFiltroCategoriaGenerico(
    stateDesejos,
    paginacaoDesejos,
    renderizarPaginaDesejos
  );
}

async function inicializarFiltroCategoriaDesejo() {
  document
    .getElementById('btnLimparFiltroCategoriaDesejo')
    ?.addEventListener('click', limparFiltroCategoriaDesejo);

  if (stateDesejos.filtroInicializado) return;

  const inputBusca = document.getElementById('filtroBuscaCategoriaDesejo');
  const inputHidden = document.getElementById('filtroCategoriaDesejo');
  const dropdown = document.getElementById('filtroDropdownCategoriaDesejo');

  if (!inputBusca || !inputHidden || !dropdown) return;

  await inicializarFiltroCategoriaGenerico({
    inputBuscaId: 'filtroBuscaCategoriaDesejo',
    inputHiddenId: 'filtroCategoriaDesejo',
    dropdownId: 'filtroDropdownCategoriaDesejo',
    btnLimparId: 'btnLimparFiltroCategoriaDesejo',
    urlCategorias: URL_CATEGORIAS,
    stateObj: stateDesejos,
    aplicarFiltroFn: aplicarFiltroCategoriaDesejo,
    limparFiltroFn: limparFiltroCategoriaDesejo,
  });

  stateDesejos.filtroInicializado = true;
}

// Cria HTML de um card de desejo para exibicao na lista
function criarCardDesejo(d) {
  const tipoDespesaCapitalizado = d.tipoDespesa
    ? capitalizar(d.tipoDespesa)
    : '';
  const valorFormatado = formatarValor(d.valor);
  const { categoriaBadge, subcategoriaBadge } =
    criarBadgesCategoriaSubcategoriaSeparados(d.categoria, d.subcategoria);
  const corCategoria = d.categoria?.cor || 'var(--gray-700)';
  const tagsHtml = gerarTags(d.tags);

  return `
    <div class="transacao-card transacao-saida" style="--cor-categoria:${corCategoria};">
      <div class="transacao-header">
        <div class="transacao-titulo">${escaparHtml(d.titulo)}</div>
        <div class="transacao-valor transacao-saida">R$ ${valorFormatado}</div>
      </div>

      <div class="transacao-corpo">
        <div class="transacao-info-grid">
          <div class="info-linha">
            <span class="info-label">Categoria:</span>
            <span class="info-valor">
              ${categoriaBadge}
            </span>
          </div>

          ${
            subcategoriaBadge
              ? `<div class="info-linha">
            <span class="info-label">Subcategoria:</span>
            <span class="info-valor">${subcategoriaBadge}</span>
          </div>`
              : ''
          }

          ${
            tipoDespesaCapitalizado
              ? `<div class="info-linha">
            <span class="info-label">Tipo de despesa:</span>
            <span class="info-valor">${tipoDespesaCapitalizado}</span>
          </div>`
              : ''
          }
        </div>

        ${tagsHtml ? `<div class="transacao-tags">${tagsHtml}</div>` : ''}
      </div>

      <div class="transacao-acoes">
        ${criarBotoesAcao([
          {
            classe: 'success',
            onclick: `realizarDesejo('${d._id}')`,
            icone: 'fa-circle-check',
            title: 'Realizar compra',
            texto: 'Realizar',
          },
          {
            classe: 'secondary',
            onclick: `editarDesejo('${d._id}')`,
            icone: 'fa-pen',
            title: 'Editar',
          },
          {
            classe: 'danger',
            onclick: `deletarDesejo('${d._id}')`,
            icone: 'fa-trash',
            title: 'Deletar',
          },
        ])}
      </div>
    </div>
  `;
}

// Abre modal para editar item da lista de desejos
window.editarDesejo = async (id) => {
  const desejo = (await carregarDesejos()).find((item) => item._id === id);
  const categorias = await apiFetch(URL_CATEGORIAS);

  if (!desejo) return;

  let tagsModal = [...(desejo.tags || [])];

  limparErroInline();
  abrirModal({
    titulo: 'Editar item da lista de desejos',
    conteudoHTML: `
      <div class="form-group">
        <label>Título</label>
        <input type="text" id="modalTituloDesejo" value="${escaparHtml(desejo.titulo)}" required>
      </div>
      <div class="form-group">
        <label>Valor</label>
        <input type="text" inputmode="decimal" data-moeda id="modalValorDesejo" value="${desejo.valor}" required>
      </div>
      <div class="form-group">
        <label>Categoria</label>
         <div class="categoria-autocomplete">
           <input type="text" id="modalBuscaCategoriaDesejo" placeholder="Buscar categoria..." autocomplete="off" required>
           <input type="hidden" id="modalCategoriaDesejo" required>
           <div id="modalDropdownCategoriaDesejo" class="dropdown-categorias"></div>
         </div>
      </div>
      <div class="form-group" id="modalSubcategoriaGroupDesejo" style="display: none">
        <label>Subcategoria (opcional)</label>
         <div class="categoria-autocomplete">
           <input type="text" id="modalBuscaSubcategoriaDesejo" placeholder="Buscar subcategoria..." autocomplete="off">
           <input type="hidden" id="modalSubcategoriaDesejo">
           <div id="modalDropdownSubcategoriaDesejo" class="dropdown-categorias"></div>
         </div>
      </div>
      <div class="form-group">
        <label>Tipo de Despesa</label>
        <select id="modalTipoDespesa">
          <option value="">Selecione o tipo de despesa</option>
          <option value="essencial" ${desejo.tipoDespesa === 'essencial' ? 'selected' : ''}>Essencial</option>
          <option value="eventual" ${desejo.tipoDespesa === 'eventual' ? 'selected' : ''}>Eventual</option>
          <option value="opcional" ${desejo.tipoDespesa === 'opcional' ? 'selected' : ''}>Opcional</option>
        </select>
      </div>
      <div class="form-group">
        <label>Tags</label>
        <div id="modalTagsContainerDesejo" class="tag-editor-container"></div>
        <div class="tag-editor-input-row">
          <input type="text" id="modalTagInputDesejo" class="tag-editor-input" placeholder="Adicionar tag">
          <button type="button" id="modalBtnAddTagDesejo" class="btn btn-tag-add">
            <i class="fa-solid fa-plus"></i>
          </button>
        </div>
      </div>
    `,
    onSalvar: async () => {
      limparErroInline();

      const novoTitulo = $('modalTituloDesejo')?.value?.trim();
      const novoValor = parseCurrency($('modalValorDesejo')?.value);
      const novaCategoria = $('modalCategoriaDesejo')?.value;
      const novoTipoDespesa = $('modalTipoDespesa')?.value;
      const subcategoriaParaEnviar = obterSubcategoriaParaEnviar(
        'modalBuscaSubcategoriaDesejo',
        'modalSubcategoriaDesejo'
      );

      // Valida campos obrigatórios
      if (!novoTitulo || !novoValor || !novaCategoria) {
        mostrarErroInline('Por favor, preencha todos os campos obrigatórios');
        return;
      }

      try {
        const dados = {
          titulo: novoTitulo,
          valor: novoValor,
          categoria: novaCategoria,
          subcategoria: subcategoriaParaEnviar,
          tags: tagsModal,
        };

        if (novoTipoDespesa) {
          dados.tipoDespesa = novoTipoDespesa;
        }

        await apiFetch(`${URL_LISTA_DESEJOS}/${id}`, {
          method: 'PUT',
          body: JSON.stringify(dados),
        });

        fecharModal();
        listarDesejos();
      } catch (erro) {
        mostrarErroInline(erro.message || 'Erro ao atualizar desejo');
      }
    },
  });

  inicializarEditorTags({
    tags: tagsModal,
    containerId: 'modalTagsContainerDesejo',
    inputId: 'modalTagInputDesejo',
    addButtonId: 'modalBtnAddTagDesejo',
  });

  const modalSubGroup = $('modalSubcategoriaGroupDesejo');
  const atualizarVisibilidadeModal = (lista) => {
    if (modalSubGroup)
      modalSubGroup.style.display = lista && lista.length ? '' : 'none';
  };

  // inicializa autocomplete de categoria para o modal e atualiza subcategoria
  setupCategoriaAutocomplete(
    'modalBuscaCategoriaDesejo',
    'modalCategoriaDesejo',
    'modalDropdownCategoriaDesejo',
    categorias,
    async (catId) => {
      // se alterar a categoria durante a edição, limpamos a subcategoria anterior
      subcategoriaAutocompleteModal?.limpar?.();

      const subs = await carregarSubcategorias(catId);
      subcategoriaAutocompleteModal.atualizarOpcoes(subs);
      atualizarVisibilidadeModal(subs);
    }
  );

  // subcategoria modal
  const subcategoriaAutocompleteModal = setupSubcategoriaAutocomplete(
    'modalBuscaSubcategoriaDesejo',
    'modalSubcategoriaDesejo',
    'modalDropdownSubcategoriaDesejo',
    []
  );
  atualizarVisibilidadeModal([]);

  if (desejo.categoria) {
    const inputBusca = $('modalBuscaCategoriaDesejo');
    const inputHidden = $('modalCategoriaDesejo');
    if (inputBusca && inputHidden) {
      inputBusca.value = desejo.categoria.nome;
      inputHidden.value = desejo.categoria._id;
      const cor = desejo.categoria.cor || '';
      inputBusca.style.boxShadow = cor ? `inset 4px 0 0 ${cor}` : '';
    }
    const subs = await carregarSubcategorias(desejo.categoria._id);
    subcategoriaAutocompleteModal.atualizarOpcoes(subs);
    atualizarVisibilidadeModal(subs);
    if (desejo.subcategoria) {
      const inp = $('modalBuscaSubcategoriaDesejo');
      const hid = $('modalSubcategoriaDesejo');
      if (inp && hid) {
        inp.value = desejo.subcategoria.nome;
        hid.value = desejo.subcategoria._id;
      }
    }
  }
};

// Converte um desejo em transacao real e remove da lista
window.realizarDesejo = async (id) => {
  const desejo = (await carregarDesejos()).find((item) => item._id === id);
  const contas = await apiFetch(URL_CONTAS);

  if (!desejo) return;

  let labelCarteira = 'Carteira (dinheiro físico)';
  try {
    const carteira = await apiFetch('/carteira');
    if (carteira && typeof carteira.saldo !== 'undefined') {
      labelCarteira += ` - R$ ${formatarValor(carteira.saldo)}`;
    }
  } catch {
    // ignore failure
  }

  const opcoesConta = contas
    .map((c) => `<option value="${c._id}">${escaparHtml(c.nome)}</option>`)
    .join('');

  limparErroInline();
  abrirModal({
    titulo: 'Realizar compra',
    conteudoHTML: `
      <p style="margin-bottom: 16px; color: var(--text-secondary);">
        Transformar <strong>${escaparHtml(desejo.titulo)}</strong> em uma transacao real.
      </p>
      <div class="form-group">
        <label>Conta ou carteira</label>
        <select id="modalContaDesejo" required>
          <option value="" selected disabled>Selecione a origem</option>
          <option value="carteira">${labelCarteira}</option>
          ${opcoesConta}
        </select>
      </div>
      <div class="form-group">
        <label>Valor</label>
        <input type="text" inputmode="decimal" data-moeda id="modalValorTransacao" value="${desejo.valor}">
      </div>
      <div class="form-group">
        <label>Status do pagamento</label>
        <select id="modalStatusTransacao">
          <option value="" selected disabled>Selecione o status</option>
          <option value="pago">Pago</option>
          <option value="pendente">Pendente</option>
        </select>
      </div>
      <div class="form-group">
        <label>Data</label>
        <input type="date" id="modalDataTransacao" value="${new Date().toISOString().split('T')[0]}">
      </div>
    `,
    onSalvar: async () => {
      limparErroInline();

      const conta = $('modalContaDesejo')?.value;
      const valor = parseCurrency($('modalValorTransacao')?.value);
      const status = $('modalStatusTransacao')?.value;
      const data = $('modalDataTransacao')?.value;

      if (!conta) {
        mostrarErroInline('Por favor, selecione uma conta ou carteira');
        return;
      }

      if (!status) {
        mostrarErroInline('Por favor, selecione um status');
        return;
      }

      if (!valor || valor <= 0) {
        mostrarErroInline('Por favor, informe um valor válido');
        return;
      }

      try {
        // Realiza desejo em endpoint único (cria transação + remove desejo)
        await apiFetch(`${URL_LISTA_DESEJOS}/${id}/realizar`, {
          method: 'POST',
          body: JSON.stringify({
            conta,
            valor,
            status,
            data: data || new Date().toISOString(),
          }),
        });

        fecharModal();
        listarDesejos();
      } catch (err) {
        mostrarErroInline(err.message);
      }
    },
  });
};

// Remove item da lista de desejos com confirmacao
window.deletarDesejo = async (id) => {
  abrirModalConfirmacao({
    titulo: 'Confirmar exclusao',
    mensagem: 'Tem certeza que deseja deletar este item da lista de desejos?',
    onConfirmar: async () => {
      try {
        await apiFetch(`${URL_LISTA_DESEJOS}/${id}`, {
          method: 'DELETE',
        });
        fecharModal();
        listarDesejos();
      } catch (err) {
        mostrarNotificacao(err.message || 'Erro ao deletar desejo', 'erro');
      }
    },
  });
};

document.addEventListener('DOMContentLoaded', () => {
  paginacaoDesejos.init();

  if ($('formListaDesejo')) {
    inicializarTags(tags);
  }
});
