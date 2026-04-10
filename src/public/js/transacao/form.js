import { limparCategoriaSelecionada } from '../categoria.js';
import {
  mostrarErroInline,
  limparErroInline,
  garantirErroInline,
  abrirModalErro,
} from '../modalEditar.js';
import {
  mostrarNotificacao,
  notificarOperacao,
  agendarNotificacaoOperacao,
  tratarErro,
  extrairMensagemErroInline,
} from '../notification.js';
const { parseISO } = window.dateFns;
import {
  showElement,
  hideElement,
  $,
  parseCurrency,
  createFormSubmitGuard,
  resetarTagsFormulario,
  inicializarTags,
  obterSubcategoriaParaEnviar,
  resetFormWithMasks,
  contaSelecionadaEhCredito,
} from '../helpers/index.js';
import { criarTransacao } from './service.js';
import { listarTransacoes } from './render.js';

let tags = [];

const FORM_ERRO_ID = 'formErroInlineTransacao';
const FORM_MSG_ERRO_ID = 'formMensagemErroTransacao';
const MENSAGEM_ENTRADA_CREDITO =
  'Não é permitido lançar entradas em cartão de crédito';

function sincronizarTipoParaContaCredito(
  selectConta,
  selectTipo,
  tipoDespesaSelect
) {
  if (!selectConta || !selectTipo) {
    return;
  }

  const isCredito = contaSelecionadaEhCredito(selectConta);
  const optionEntrada = selectTipo.querySelector('option[value="entrada"]');

  if (optionEntrada) {
    optionEntrada.disabled = isCredito;
  }

  if (isCredito && selectTipo.value !== 'saida') {
    selectTipo.value = 'saida';
  }

  if (selectTipo.value === 'saida') {
    showElement($('tipoDespesaContainer'));
  } else {
    hideElement($('tipoDespesaContainer'));
    if (tipoDespesaSelect) tipoDespesaSelect.value = '';
  }
}

function resetarFormularioTransacao(
  form,
  tipoDespesaSelect,
  parcelasContainer
) {
  resetarTagsFormulario(tags);
  resetFormWithMasks(form);
  hideElement($('tipoDespesaContainer'));
  tipoDespesaSelect.value = '';
  hideElement(parcelasContainer);
  limparCategoriaSelecionada();

  // também apagar subcategoria
  const subcat = $('subcategoria');
  if (subcat) subcat.value = '';

  // limpar data da primeira parcela
  const dataPrimeiraParcela = $('dataPrimeiraParcela');
  if (dataPrimeiraParcela) dataPrimeiraParcela.value = '';
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
  const contaSelect = $('conta');

  // garantir limpeza de subcategoria quando a categoria mudar
  inputCategoria?.addEventListener('input', () => {
    // tiver alteração manual a categoria perdida, limpa subcategoria
    if (inputSubcategoria) inputSubcategoria.value = '';
    const subcat = $('subcategoria');
    if (subcat) subcat.value = '';
  });

  // Controla exibicao de campos condicionais
  tipoSelect?.addEventListener('change', () => {
    if (
      tipoSelect.value === 'entrada' &&
      contaSelecionadaEhCredito(contaSelect)
    ) {
      mostrarErroInline(
        MENSAGEM_ENTRADA_CREDITO,
        FORM_ERRO_ID,
        FORM_MSG_ERRO_ID
      );
      tipoSelect.value = 'saida';
    }

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

  contaSelect?.addEventListener('change', () => {
    sincronizarTipoParaContaCredito(contaSelect, tipoSelect, tipoDespesaSelect);
  });
  sincronizarTipoParaContaCredito(contaSelect, tipoSelect, tipoDespesaSelect);

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
      const notificacaoTransacao = {
        objeto: `Transação "${tituloTransacao}"`,
        acao: 'criacao',
        genero: 'feminino',
      };

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

      if (
        tipoSelect?.value === 'entrada' &&
        contaSelecionadaEhCredito(contaSelect)
      ) {
        mostrarErroInline(
          MENSAGEM_ENTRADA_CREDITO,
          FORM_ERRO_ID,
          FORM_MSG_ERRO_ID
        );
        return;
      }

      try {
        const payload = {
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
        };

        if (
          form.recorrencia.value !== 'nenhuma' &&
          form.dataPrimeiraParcela.value
        ) {
          payload.dataPrimeiraParcela = parseISO(
            form.dataPrimeiraParcela.value
          );
        }

        await criarTransacao(payload);

        if (acao === 'salvar-adicionar-outro') {
          notificarOperacao(notificacaoTransacao);
          resetarFormularioTransacao(
            form,
            tipoDespesaSelect,
            parcelasContainer
          );
        } else if (window.location.pathname.includes('adicionar-transacao')) {
          agendarNotificacaoOperacao(notificacaoTransacao);
          window.location.href = '/html/transacoes.html';
        } else {
          notificarOperacao(notificacaoTransacao);
          resetarFormularioTransacao(
            form,
            tipoDespesaSelect,
            parcelasContainer
          );
          await listarTransacoes();
        }
      } catch (erro) {
        const mensagemInline = extrairMensagemErroInline(erro);
        if (mensagemInline) {
          mostrarErroInline(mensagemInline, FORM_ERRO_ID, FORM_MSG_ERRO_ID);
          return;
        }

        const msg = tratarErro(erro, 'Erro ao criar transação');
        mostrarNotificacao(msg, 'erro');
      }
    })
  );
}
