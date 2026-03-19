import {
  abrirModal,
  limparErroInline,
  fecharModal,
  mostrarErroInline,
} from '../modalEditar.js';
import { abrirModalConfirmacao } from '../modalDeletar.js';
import { desejosService } from './api.js';
import {
  $,
  showElement,
  hideElement,
  formatarValor,
  setupCategoriaAutocomplete,
  carregarSubcategorias,
  setupSubcategoriaAutocomplete,
  obterSubcategoriaParaEnviar,
  inicializarEditorTags,
  parseCurrency,
  executarAcaoModal,
} from '../helpers/index.js';
import { buildEditarDesejoHTML, buildRealizarDesejoHTML } from './templates.js';

export function abrirModalEditarDesejo({ desejo, categorias, tags, onSave }) {
  if (!desejo) return;

  limparErroInline();

  abrirModal({
    titulo: 'Editar item da lista de desejos',
    conteudoHTML: buildEditarDesejoHTML(desejo),
    onSalvar: () => onSave?.(),
  });

  inicializarModalEditarDesejo({ desejo, categorias, tags });
}

function inicializarModalEditarDesejo({ desejo, categorias, tags }) {
  const tagsModal = tags || [...(desejo.tags || [])];

  inicializarEditorTags({
    tags: tagsModal,
    containerId: 'modalTagsContainerDesejo',
    inputId: 'modalTagInputDesejo',
    addButtonId: 'modalBtnAddTagDesejo',
  });

  const modalSubGroup = $('modalSubcategoriaGroupDesejo');

  const atualizarVisibilidadeModal = (lista) => {
    if (!modalSubGroup) return;
    if (lista && lista.length) showElement(modalSubGroup);
    else hideElement(modalSubGroup);
  };

  setupCategoriaAutocomplete(
    'modalBuscaCategoriaDesejo',
    'modalCategoriaDesejo',
    'modalDropdownCategoriaDesejo',
    categorias,
    async (catId) => {
      subcategoriaAutocompleteModal?.limpar?.();

      const subs = await carregarSubcategorias(catId);
      subcategoriaAutocompleteModal.atualizarOpcoes(subs);
      atualizarVisibilidadeModal(subs);
    }
  );

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

    carregarSubcategorias(desejo.categoria._id).then((subs) => {
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
    });
  }
}

export function abrirModalRealizarDesejo({
  desejo,
  contas,
  carteiraLabel,
  onSave,
}) {
  if (!desejo) return;

  limparErroInline();

  abrirModal({
    titulo: 'Realizar compra',
    conteudoHTML: buildRealizarDesejoHTML(desejo, contas, carteiraLabel),
    onSalvar: () => onSave?.(),
  });
}

export async function abrirModalEditarDesejoComAcoes({
  id,
  state,
  onAtualizar,
}) {
  const desejo = state.itens.find((item) => item._id === id);
  if (!desejo) return;

  const categorias = await desejosService.listarCategorias();
  let tags = [...(desejo.tags || [])];

  abrirModalEditarDesejo({
    desejo,
    categorias,
    tags,
    onSave: async () => {
      limparErroInline();

      const formData = getEditarDesejoFormData({ tags });
      const valorNum = parseCurrency(formData.valor);

      if (!formData.titulo || !valorNum || !formData.categoria) {
        mostrarErroInline('Por favor, preencha todos os campos obrigatórios');
        return;
      }

      await executarAcaoModal({
        acao: async () => {
          const atualizado = await desejosService.atualizar(id, {
            ...formData,
            valor: valorNum,
          });

          state.updateItem(atualizado);
        },
        mensagemErro: 'Erro ao atualizar desejo',
        onAtualizar: () => {
          fecharModal();
          onAtualizar?.();
        },
      });
    },
  });
}

export async function abrirModalRealizarDesejoComAcoes({
  id,
  state,
  onAtualizar,
}) {
  const desejo = state.itens.find((item) => item._id === id);
  if (!desejo) return;

  const contas = await desejosService.listarContas();
  const carteira = await desejosService.carregarCarteira().catch(() => null);
  const labelCarteira = carteira?.saldo
    ? `Carteira (dinheiro físico) - R$ ${formatarValor(carteira.saldo)}`
    : 'Carteira (dinheiro físico)';

  abrirModalRealizarDesejo({
    desejo,
    contas,
    carteiraLabel: labelCarteira,
    onSave: async () => {
      limparErroInline();

      const { conta, tipoDespesa, valor, status, data } =
        getRealizarDesejoFormData();
      const valorNum = parseCurrency(valor);

      if (!conta) {
        mostrarErroInline('Por favor, selecione uma conta ou carteira');
        return;
      }

      if (!status) {
        mostrarErroInline('Por favor, selecione um status');
        return;
      }

      if (!valorNum || valorNum <= 0) {
        mostrarErroInline('Por favor, informe um valor válido');
        return;
      }

      await executarAcaoModal({
        acao: async () => {
          await desejosService.realizar(id, {
            conta,
            tipoDespesa: tipoDespesa || undefined,
            valor: valorNum,
            status,
            data: data || new Date().toISOString(),
          });

          state.removeItem(id);
        },
        mensagemErro: 'Erro ao realizar desejo',
        onAtualizar: () => {
          fecharModal();
          onAtualizar?.();
        },
      });
    },
  });
}

export async function abrirModalConfirmarRemoverDesejo({
  id,
  state,
  onAtualizar,
}) {
  abrirModalConfirmacao({
    titulo: 'Confirmar exclusao',
    mensagem: 'Tem certeza que deseja deletar este item da lista de desejos?',
    onConfirmar: async () => {
      await executarAcaoModal({
        acao: async () => {
          await desejosService.deletar(id);
          state.removeItem(id);
        },
        mensagemErro: 'Erro ao deletar desejo',
        onAtualizar: () => {
          fecharModal();
          onAtualizar?.();
        },
      });
    },
  });
}

export function getRealizarDesejoFormData() {
  return {
    conta: $('modalContaDesejo')?.value,
    tipoDespesa: $('modalTipoDespesa')?.value,
    valor: $('modalValorTransacao')?.value,
    status: $('modalStatusTransacao')?.value,
    data: $('modalDataTransacao')?.value,
  };
}

export function getEditarDesejoFormData({ tags = [] } = {}) {
  return {
    titulo: $('modalTituloDesejo')?.value?.trim(),
    valor: $('modalValorDesejo')?.value,
    categoria: $('modalCategoriaDesejo')?.value,
    tipoDespesa: $('modalTipoDespesa')?.value,
    subcategoria: obterSubcategoriaParaEnviar(
      'modalBuscaSubcategoriaDesejo',
      'modalSubcategoriaDesejo'
    ),
    tags,
  };
}
