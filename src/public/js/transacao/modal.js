import { apiFetch } from '../config.js';
import { abrirModal, fecharModal, mostrarErroInline } from '../modalEditar.js';
import { abrirModalConfirmacao } from '../modalDeletar.js';
import {
  showElement,
  hideElement,
  $,
  inicializarEditorTags,
  setupCategoriaAutocomplete,
  carregarSubcategorias,
  setupSubcategoriaAutocomplete,
  obterSubcategoriaParaEnviar,
  executarAcaoModal,
  applyCategoryTheme,
  contaSelecionadaEhCredito,
} from '../helpers/index.js';
import { templateEditarTransacaoModal } from './templates.js';
import {
  carregarTransacoes,
  atualizarTransacao,
  deletarTransacao as deletarTransacaoService,
} from './service.js';
import { listarTransacoes } from './render.js';
import { obterTransacaoPorId } from './service.js';

const URL_CATEGORIAS = `${window.location.origin}/categorias`;
const URL_CONTAS = `${window.location.origin}/contas`;
const MENSAGEM_ENTRADA_CREDITO =
  'Não é permitido lançar entradas em cartão de crédito';

function sincronizarTipoModalCredito() {
  const selectConta = $('modalContaTransacao');
  const selectTipo = $('modalTipoTransacao');
  const optionEntrada = selectTipo?.querySelector('option[value="entrada"]');

  if (!selectConta || !selectTipo || !optionEntrada) {
    return;
  }

  const isCredito = contaSelecionadaEhCredito(selectConta);
  optionEntrada.disabled = isCredito;

  if (isCredito && selectTipo.value !== 'saida') {
    selectTipo.value = 'saida';
  }
}

export const editarTransacao = async (id) => {
  const transacao =
    obterTransacaoPorId(id) ||
    (await carregarTransacoes()).find((t) => t._id === id);
  const categorias = await apiFetch(URL_CATEGORIAS);
  const contas = await apiFetch(URL_CONTAS);

  if (!transacao) return;

  let tagsModal = [...(transacao.tags || [])];

  abrirModal({
    titulo: 'Editar transação',
    conteudoHTML: templateEditarTransacaoModal(transacao, contas),
    onSalvar: async () => {
      const novoTitulo = $('modalTituloTransacao')?.value;
      const novoValor = parseFloat(
        ($('modalValorTransacao')?.value || '').replace(',', '.')
      );
      const novoTipo = $('modalTipoTransacao')?.value;
      const novoStatus = $('modalStatusTransacao')?.value;
      const novaConta = $('modalContaTransacao')?.value;
      const novaCategoria = $('modalCategoriaTransacao')?.value;
      const novoTipoDespesa = $('modalTipoDespesa')?.value;

      const subcategoriaParaEnviar = obterSubcategoriaParaEnviar(
        'modalBuscaSubcategoriaTransacao',
        'modalSubcategoriaTransacao'
      );

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

      if (
        novoTipo === 'entrada' &&
        contaSelecionadaEhCredito($('modalContaTransacao'))
      ) {
        mostrarErroInline(MENSAGEM_ENTRADA_CREDITO);
        return;
      }

      const dados = {
        titulo: novoTitulo,
        valor: novoValor,
        tipo: novoTipo,
        status: novoStatus,
        conta: novaConta,
        categoria: novaCategoria,
        subcategoria: subcategoriaParaEnviar,
        tags: tagsModal,
      };

      if (novoTipo === 'saida') {
        dados.tipoDespesa = novoTipoDespesa || undefined;
      }

      const modalDataPrimeiraParcela = $('modalDataPrimeiraParcela');
      if (modalDataPrimeiraParcela && modalDataPrimeiraParcela.value) {
        dados.dataPrimeiraParcela = new Date(modalDataPrimeiraParcela.value);
      }

      await executarAcaoModal({
        acao: () => atualizarTransacao(id, dados),
        mensagemErro: 'Erro ao atualizar transação',
        notificacaoSucesso: {
          objeto: `Transação "${novoTitulo}"`,
          acao: 'atualizacao',
          genero: 'feminino',
        },
        onAtualizar: async () => {
          fecharModal();
          await listarTransacoes();
        },
      });
    },
  });

  inicializarEditorTags({
    tags: tagsModal,
    containerId: 'modalTagsContainer',
    inputId: 'modalTagInput',
    addButtonId: 'modalBtnAddTag',
  });

  const modalSubGroup = $('modalSubcategoriaGroup');
  const atualizarVisibilidadeModal = (lista) => {
    if (modalSubGroup) {
      modalSubGroup.classList.toggle('is-hidden', !(lista && lista.length));
    }
  };

  // inicializa autocomplete de categoria para o modal
  setupCategoriaAutocomplete(
    'modalBuscaCategoriaTransacao',
    'modalCategoriaTransacao',
    'modalDropdownCategoriaTransacao',
    categorias,
    async (catId) => {
      // ao escolher nova categoria enquanto edita, limpa eventual seleção de subcategoria
      subcategoriaAutocompleteModal?.limpar?.();

      // busca subcategorias para a nova categoria
      const subs = await carregarSubcategorias(catId);
      subcategoriaAutocompleteModal.atualizarOpcoes(subs);
      atualizarVisibilidadeModal(subs);
    }
  );

  // subcategoria autocompleto para o modal (inicialmente vazio)
  const subcategoriaAutocompleteModal = setupSubcategoriaAutocomplete(
    'modalBuscaSubcategoriaTransacao',
    'modalSubcategoriaTransacao',
    'modalDropdownSubcategoriaTransacao',
    []
  );
  // começa escondido
  atualizarVisibilidadeModal([]);

  if (transacao.categoria) {
    const inputBusca = $('modalBuscaCategoriaTransacao');
    const inputHidden = $('modalCategoriaTransacao');
    if (inputBusca && inputHidden) {
      inputBusca.value = transacao.categoria.nome;
      inputHidden.value = transacao.categoria._id;
      applyCategoryTheme(inputBusca, transacao.categoria.cor, {
        accent: true,
        categoryName: transacao.categoria.nome,
      });
    }
    // carregar lista de subcategorias existente para pré‑selecionar
    const subs = await carregarSubcategorias(transacao.categoria._id);
    subcategoriaAutocompleteModal.atualizarOpcoes(subs);
    atualizarVisibilidadeModal(subs);
    if (transacao.subcategoria) {
      const inp = $('modalBuscaSubcategoriaTransacao');
      const hid = $('modalSubcategoriaTransacao');
      if (inp && hid) {
        inp.value = transacao.subcategoria.nome;
        hid.value = transacao.subcategoria._id;
      }
    }
  }

  const selectTipo = $('modalTipoTransacao');
  const despField = $('modalGrupoTipoDespesa');
  const selectConta = $('modalContaTransacao');
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

  selectConta?.addEventListener('change', sincronizarTipoModalCredito);
  selectTipo?.addEventListener('change', sincronizarTipoModalCredito);
  sincronizarTipoModalCredito();
};

export const deletarTransacao = async (id) => {
  const transacao =
    obterTransacaoPorId(id) ||
    (await carregarTransacoes()).find((item) => item._id === id);

  abrirModalConfirmacao({
    titulo: 'Confirmar exclusão',
    mensagem: 'Tem certeza que deseja deletar esta transação?',
    onConfirmar: async () => {
      await executarAcaoModal({
        acao: () => deletarTransacaoService(id),
        mensagemErro: 'Erro ao deletar transação',
        notificacaoSucesso: {
          objeto: transacao?.titulo
            ? `Transação "${transacao.titulo}"`
            : 'Transação',
          acao: 'delecao',
          genero: 'feminino',
        },
        onAtualizar: async () => {
          fecharModal();
          await listarTransacoes();
        },
      });
    },
  });
};

window.editarTransacao = editarTransacao;
window.deletarTransacao = deletarTransacao;
