import { showElement, hideElement } from '../helpers/dom.js';

export function setupProjecaoModal({
  modal,
  btnAbrir,
  btnFechar,
  onOpen,
  onClose,
}) {
  if (!modal) return { open: () => {}, close: () => {} };

  const open = async () => {
    await onOpen?.();
    showElement(modal);
  };

  const close = () => {
    hideElement(modal);
    onClose?.();
  };

  if (btnAbrir) {
    btnAbrir.addEventListener('click', open);
  }
  if (btnFechar) {
    btnFechar.addEventListener('click', close);
  }

  return { open, close };
}
