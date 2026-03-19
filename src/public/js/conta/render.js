import { setHTMLById, $ } from '../helpers/index.js';
import { templateContaCard, templateSelectConta } from './templates.js';

export function renderContas(contas) {
  const container = $('contas');
  if (!container) return;

  const html = contas.map(templateContaCard).join('');
  setHTMLById('contas', html);
}

export function renderSelectContas(selectId, contas, carteiraSaldoLabel = '') {
  const select = $(selectId);
  if (!select) return;

  select.innerHTML = templateSelectConta(contas, selectId);

  if (carteiraSaldoLabel) {
    const option = select.querySelector(`option[value="carteira"]`);
    if (option) option.textContent = carteiraSaldoLabel;
  }
}

export function bindContaActions(containerId, handler) {
  const container = $(containerId);
  if (!container) return;

  container.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-conta-action]');
    if (!button) return;

    const action = button.dataset.contaAction;
    const contaId = button.closest('[data-conta-id]')?.dataset.contaId;
    if (!action || !contaId) return;

    handler(action, contaId);
  });
}
