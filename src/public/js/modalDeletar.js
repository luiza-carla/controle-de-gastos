import {
  setHTMLById,
  setTextById,
  showElement,
  hideElement,
  showModal,
  hideModal,
  $,
} from './helpers/index.js';
import { limparErroInline } from './modalEditar.js';

// Armazena callback de confirmacao do modal
let confirmarCallback = null;

// Abre modal de confirmacao com titulo e mensagem
export function abrirModalConfirmacao({ titulo, mensagem, onConfirmar }) {
  limparErroInline();

  // Atualiza titulo e conteudo do modal
  setHTMLById(
    'modalTitulo',
    `<i class="fa-solid fa-triangle-exclamation modal-icon-danger"></i> ${titulo}`
  );
  setHTMLById(
    'modalConteudo',
    '<p id="modalConfirmacaoMensagem" class="modal-copy"></p>'
  );
  setTextById('modalConfirmacaoMensagem', mensagem);

  // Define callback de confirmacao
  confirmarCallback = onConfirmar;

  // Ajusta botoes exibidos no modal
  hideElement($('modalFooterEditar'));
  showElement($('modalFooterConfirmar'));
  hideElement($('modalFooterErro'));

  showModal();
}

// Fecha modal global
export function fecharModal() {
  limparErroInline();
  confirmarCallback = null;
  hideModal();
}

// Trata clique no botao de confirmar
document.addEventListener('click', (e) => {
  if (e.target.id === 'modalConfirmar') {
    if (confirmarCallback) confirmarCallback();
  }
});
