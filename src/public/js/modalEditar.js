import {
  setHTMLById,
  showElement,
  hideElement,
  showModal,
  hideModal,
  addClass,
  removeClass,
  $,
  bindCurrencyInputs,
  createFormSubmitGuard,
} from './helpers/index.js';

// Armazena callback de salvamento do modal
let salvarCallback = null;
let salvarGuard = null;

function definirFooterModal(tipo) {
  hideElement($('modalFooterEditar'));
  hideElement($('modalFooterConfirmar'));
  hideElement($('modalFooterErro'));

  if (tipo === 'editar') showElement($('modalFooterEditar'));
  if (tipo === 'confirmar') showElement($('modalFooterConfirmar'));
  if (tipo === 'erro') showElement($('modalFooterErro'));
}

// Abre modal de edicao com titulo e conteudo personalizados
export function abrirModal({ titulo, conteudoHTML, onSalvar }) {
  limparErroInline();

  // Atualiza titulo e conteudo do modal
  setHTMLById(
    'modalTitulo',
    `<i class="fa-solid fa-pen-to-square"></i> ${titulo}`
  );
  setHTMLById('modalConteudo', conteudoHTML);

  // Aplica máscara de moeda em campos do modal (se houver)
  bindCurrencyInputs({ root: $('modalConteudo') });

  // Define callback de salvar (com proteção contra cliques rápidos)
  salvarCallback = onSalvar;
  salvarGuard = onSalvar
    ? createFormSubmitGuard(document.createElement('form'))(onSalvar)
    : null;

  // Ajusta botoes exibidos no modal
  definirFooterModal('editar');

  showModal();
}

// Fecha modal global
export function fecharModal() {
  limparErroInline();
  salvarCallback = null;
  salvarGuard = null;
  hideModal();
}

// Abre modal de erro com mensagem informada
export function abrirModalErro(mensagem) {
  limparErroInline();

  setHTMLById(
    'modalTitulo',
    '<i class="fa-solid fa-circle-xmark" style="color: var(--btn-danger);"></i> Erro'
  );
  setHTMLById(
    'modalConteudo',
    `<p style="margin: 0; padding: 10px 0; color: var(--text-secondary); line-height: 1.6;">${mensagem}</p>`
  );

  definirFooterModal('erro');

  showModal();
}

// Mostra erro inline no modal (padrao) ou em alvo customizado
export function mostrarErroInline(
  mensagem,
  erroId = 'modalErroInline',
  mensagemId = 'modalMensagemErro'
) {
  const erroEl = $(erroId);
  setHTMLById(mensagemId, mensagem);
  if (erroEl) addClass(erroEl, 'ativo');
}

// Limpa erro inline no modal (padrao) ou em alvo customizado
export function limparErroInline(
  erroId = 'modalErroInline',
  mensagemId = 'modalMensagemErro'
) {
  const erroEl = $(erroId);
  if (erroEl) removeClass(erroEl, 'ativo');
  setHTMLById(mensagemId, '');
}

// Garante estrutura de erro inline no elemento informado
export function garantirErroInline(
  raizEl,
  erroId = 'modalErroInline',
  mensagemId = 'modalMensagemErro'
) {
  if (!raizEl || $(erroId)) return;

  raizEl.insertAdjacentHTML(
    'afterbegin',
    `
      <div id="${erroId}" class="modal-erro-inline">
        <p id="${mensagemId}" class="modal-mensagem-erro"></p>
      </div>
    `
  );
}

// Trata cliques dos botoes do modal
document.addEventListener('click', (e) => {
  if (e.target.id === 'modalSalvar') {
    if (salvarGuard) {
      salvarGuard(e);
      return;
    }
    if (salvarCallback) salvarCallback();
  }
  if (
    e.target.id === 'modalCancelar' ||
    e.target.id === 'modalFechar' ||
    e.target.id === 'modalFecharErro'
  ) {
    fecharModal();
  }
});
