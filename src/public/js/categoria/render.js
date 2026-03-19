import { $ } from '../helpers/index.js';

const HIDDEN_CLASS = 'is-hidden';

export function toggleElemento(el, mostrar) {
  if (!el) return;
  el.classList.toggle(HIDDEN_CLASS, !mostrar);
  if (mostrar) {
    el.style.display = '';
  } else {
    el.style.display = 'none';
  }
}

export function getElemento(id) {
  return $(id);
}

export function esconderSubcategoriaGroup(groupId) {
  const group = getElemento(groupId);
  if (!group) return;
  group.classList.add(HIDDEN_CLASS);
  group.style.display = 'none';
}

export function mostrarSubcategoriaGroup(groupId) {
  const group = getElemento(groupId);
  if (!group) return;
  group.classList.remove(HIDDEN_CLASS);
  group.style.display = '';
}

export function limparAutocomplete(autocomplete) {
  if (!autocomplete) return;
  autocomplete.limpar?.();
}

export function bindCategoriaInput(inputId, onFocus, onInput) {
  const input = getElemento(inputId);
  if (!input) return;

  if (onFocus) {
    input.addEventListener('focus', () => onFocus(input.value || ''));
  }

  if (onInput) {
    input.addEventListener('input', () => onInput(input.value));
  }
}
