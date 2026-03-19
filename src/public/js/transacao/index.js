import { initTransacaoForm } from './form.js';
import { initTransacoesList } from './render.js';
import './modal.js';

export async function initTransacoes() {
  await initTransacaoForm();
  await initTransacoesList();
}
