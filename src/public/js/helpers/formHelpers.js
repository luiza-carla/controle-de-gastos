import { showLoadingOverlay, hideLoadingOverlay } from './dom.js';

// Helpers para prevenir envios duplicados de formulários.
// Evita que, ao clicar várias vezes em um botão de submit, a lógica de envio seja executada
// mais de uma vez (por exemplo: criar 3 transações em vez de 1 quando o usuário clica várias vezes).

/**
 * Cria um wrapper para funções de envio de formulários, bloqueando submissões enquanto
 * a requisição anterior ainda estiver em andamento.
 *
 * @param {HTMLFormElement} form O formulário alvo
 * @param {Object} [options]
 * @param {boolean} [options.disableSubmitButtons=true] Desabilita os botões de submit durante o envio
 * @param {string} [options.submitButtonSelector='button[type="submit"], input[type="submit"]']
 *   Seletor usado para encontrar botões que devem ser desabilitados durante o envio.
 * @returns {(handler: (event: SubmitEvent) => Promise<any>) => (event: SubmitEvent) => Promise<void>}
 */
export function createFormSubmitGuard(
  form,
  {
    disableSubmitButtons = true,
    submitButtonSelector = 'button[type="submit"], input[type="submit"]',
    showLoading = true,
    loadingMessage = 'Enviando...',
  } = {}
) {
  if (!form) {
    return (handler) => handler;
  }

  let isSubmitting = false;

  const getSubmitButtons = () =>
    Array.from(form.querySelectorAll(submitButtonSelector));

  const setButtonsDisabled = (disabled) => {
    getSubmitButtons().forEach((button) => {
      if (disabled) {
        button.dataset._disabledDuringSubmit = String(button.disabled);
        button.disabled = true;
      } else {
        if (button.dataset._disabledDuringSubmit != null) {
          button.disabled = button.dataset._disabledDuringSubmit === 'true';
          delete button.dataset._disabledDuringSubmit;
        } else {
          button.disabled = false;
        }
      }
    });
  };

  return (handler) => {
    return async (event) => {
      if (isSubmitting) {
        event.preventDefault();
        return;
      }

      isSubmitting = true;

      let loadingTimer = null;
      if (showLoading) {
        // Evita piscar o overlay em validações rápidas
        loadingTimer = window.setTimeout(
          () => showLoadingOverlay(loadingMessage),
          150
        );
      }

      if (disableSubmitButtons) {
        setButtonsDisabled(true);
      }

      try {
        await handler(event);
      } finally {
        isSubmitting = false;
        if (disableSubmitButtons) {
          setButtonsDisabled(false);
        }
        if (showLoading) {
          if (loadingTimer) window.clearTimeout(loadingTimer);
          hideLoadingOverlay();
        }
      }
    };
  };
}

export function resetFormWithMasks(form) {
  if (!form) return;

  form.reset();

  const currencyInputs = form.querySelectorAll('input[data-moeda]');
  currencyInputs.forEach((input) => {
    if (input._currencyMask) {
      input._currencyMask.value = '';
      return;
    }

    input.value = '';
  });
}
