import { desejosService } from './api.js';
import {
  $,
  parseCurrency,
  inicializarTags,
  resetarTagsFormulario,
  createFormSubmitGuard,
} from '../helpers/index.js';
import { limparCategoriaSelecionada } from '../categoria.js';
import {
  abrirModalErro,
  garantirErroInline,
  limparErroInline,
} from '../modalEditar.js';

export function initFormDesejos(state, { onCreated }) {
  const form = $('formListaDesejo');
  if (!form) return;

  const inputCategoria = $('buscaCategoria');
  const inputSubcategoria = $('buscaSubcategoria');
  let tags = [];

  form.noValidate = true;
  garantirErroInline(
    form,
    'formErroInlineListaDesejo',
    'formMensagemErroListaDesejo'
  );

  inicializarTags(tags);

  inputCategoria?.addEventListener('input', () => {
    if (inputSubcategoria) inputSubcategoria.value = '';
    const subcat = $('subcategoria');
    if (subcat) subcat.value = '';
  });

  const guardSubmit = createFormSubmitGuard(form);

  form.addEventListener(
    'submit',
    guardSubmit(async (e) => {
      e.preventDefault();
      limparErroInline(
        'formErroInlineListaDesejo',
        'formMensagemErroListaDesejo'
      );

      const botaoClicado = e.submitter;
      const acao =
        botaoClicado?.getAttribute('data-action') ||
        (document.activeElement instanceof HTMLElement
          ? document.activeElement.getAttribute('data-action')
          : null) ||
        'salvar-redirect';

      const tituloDesejo = form.titulo.value;
      const categoria = $('categoria')?.value;
      const tipoDespesa = $('tipoDespesa')?.value;
      const valor = parseCurrency(form.valor.value);

      if (!tituloDesejo || !valor) {
        abrirModalErro('Por favor, preencha todos os campos obrigatórios');
        return;
      }

      if (!categoria) {
        abrirModalErro('Por favor, selecione uma categoria');
        return;
      }

      try {
        const novoDesejo = await desejosService.criar({
          titulo: tituloDesejo,
          valor,
          categoria,
          subcategoria: $('subcategoria')?.value || undefined,
          tipoDespesa: tipoDespesa || undefined,
          tags,
        });

        state.addItem?.(novoDesejo);

        if (acao === 'salvar-adicionar-outro') {
          onCreated?.(novoDesejo, { keepForm: true, action: acao });
        } else {
          onCreated?.(novoDesejo, { keepForm: false, action: acao });
        }
      } catch (erro) {
        onCreated?.(null, { error: erro });
      }
    })
  );

  return {
    setTags(newTags) {
      tags = newTags;
    },
    resetForm() {
      resetarTagsFormulario(tags);
      form.reset();
      limparCategoriaSelecionada();
    },
  };
}
