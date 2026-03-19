import { limparCategoriaSelecionada } from '../categoria.js';
import {
  mostrarErroInline,
  limparErroInline,
  garantirErroInline,
  abrirModalErro,
} from '../modalEditar.js';
import {
  mostrarNotificacao,
  persistirNotificacaoParaProximaTela,
  tratarErro,
} from '../notification.js';
import {
  showElement,
  hideElement,
  $,
  parseCurrency,
  createFormSubmitGuard,
  resetarTagsFormulario,
  inicializarTags,
  obterSubcategoriaParaEnviar,
} from '../helpers/index.js';
import { criarTransacao } from './service.js';
import { listarTransacoes } from './render.js';

let tags = [];

const FORM_ERRO_ID = 'formErroInlineTransacao';
const FORM_MSG_ERRO_ID = 'formMensagemErroTransacao';

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

  // também apagar subcategoria
  const subcat = $('subcategoria');
  if (subcat) subcat.value = '';
}

export async function initTransacaoForm(formId = 'formTransacao') {
  const form = $(formId);
  if (!form) return;

  inicializarTags(tags);
  form.noValidate = true;
  garantirErroInline(form, FORM_ERRO_ID, FORM_MSG_ERRO_ID);

  const tipoSelect = $('tipo');
  const tipoDespesaSelect = $('tipoDespesaContainer')?.querySelector(
    '#tipoDespesa'
  );
  const inputCategoria = $('buscaCategoria');
  const inputSubcategoria = $('buscaSubcategoria');

  const recorrenciaSelect = $('recorrencia');
  const parcelasContainer = $('parcelasContainer');

  // garantir limpeza de subcategoria quando a categoria mudar
  inputCategoria?.addEventListener('input', () => {
    // tiver alteração manual a categoria perdida, limpa subcategoria
    if (inputSubcategoria) inputSubcategoria.value = '';
    const subcat = $('subcategoria');
    if (subcat) subcat.value = '';
  });

  // Controla exibicao de campos condicionais
  tipoSelect?.addEventListener('change', () => {
    if (tipoSelect.value === 'saida') {
      showElement($('tipoDespesaContainer'));
    } else {
      hideElement($('tipoDespesaContainer'));
      if (tipoDespesaSelect) tipoDespesaSelect.value = '';
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
  const guardSubmit = createFormSubmitGuard(form);

  form.addEventListener(
    'submit',
    guardSubmit(async (e) => {
      e.preventDefault();
      limparErroInline(FORM_ERRO_ID, FORM_MSG_ERRO_ID);

      const botaoClicado = e.submitter;
      const acao = botaoClicado?.getAttribute('data-action');
      const tituloTransacao = form.titulo.value;

      const conta = $('conta')?.value;
      const categoria = $('categoria')?.value;
      const subcategoria = obterSubcategoriaParaEnviar(
        'buscaSubcategoria',
        'subcategoria'
      );
      const tipoDespesa =
        tipoSelect?.value === 'saida' ? tipoDespesaSelect?.value || null : null;
      const valor = parseCurrency(form.valor.value);

      if (
        !tituloTransacao ||
        !valor ||
        !tipoSelect?.value ||
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
        await criarTransacao({
          titulo: tituloTransacao,
          valor,
          tipo: tipoSelect.value,
          tipoDespesa,
          conta: conta,
          categoria: categoria,
          subcategoria: subcategoria || undefined,
          status: form.status.value,
          recorrencia: form.recorrencia.value,
          tags: [...tags],
          parcelamento: {
            totalParcelas: Number(form.totalParcelas.value || 1),
            parcelaAtual: Number(form.parcelaAtual.value || 1),
          },
        });

        if (acao === 'salvar-adicionar-outro') {
          mostrarNotificacao(
            `Transação "${tituloTransacao}" adicionada com sucesso!`
          );
          resetarFormularioTransacao(
            form,
            tipoDespesaSelect,
            parcelasContainer
          );
        } else if (window.location.pathname.includes('adicionar-transacao')) {
          persistirNotificacaoParaProximaTela(
            `Transação "${tituloTransacao}" adicionada com sucesso!`
          );
          window.location.href = '/html/transacoes.html';
        } else {
          mostrarNotificacao(
            `Transação "${tituloTransacao}" adicionada com sucesso!`
          );
          resetarFormularioTransacao(
            form,
            tipoDespesaSelect,
            parcelasContainer
          );
          await listarTransacoes();
        }
      } catch (erro) {
        const msg = tratarErro(erro, 'Erro ao criar transação');
        mostrarNotificacao(msg, 'erro');
      }
    })
  );
}
