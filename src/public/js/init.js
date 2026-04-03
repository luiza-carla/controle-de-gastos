import { verificarAutenticacao } from './auth.js';
import { criarConta, popularSelectContas, listarContas } from './conta.js';
import { initCarteiraPage } from './carteira.js';
import { inicializarCategorias } from './categoria.js';
import { initDesejos } from './listaDesejo.js';
import { initTransacoes } from './transacao/index.js';
import { initSalario } from './salario/index.js';
import { $, bindCurrencyInputs } from './helpers/index.js';

function bindNavigationTargets() {
  document.querySelectorAll('[data-nav-target]').forEach((element) => {
    if (element.dataset.navBound === 'true') {
      return;
    }

    element.dataset.navBound = 'true';
    element.addEventListener('click', () => {
      const target = element.getAttribute('data-nav-target');
      if (target) {
        window.location.href = target;
      }
    });
  });
}

async function initApp() {
  bindNavigationTargets();

  const autenticado = await verificarAutenticacao();
  if (!autenticado) return;

  // Módulos que só são usados quando o usuário está autenticado
  const tarefasIniciais = [import('./modalEditar.js')];

  const precisaCategorias =
    $('buscaCategoria') ||
    $('filtroBuscaCategoriaDesejo') ||
    $('filtroCategoriaDesejo');

  if (precisaCategorias) {
    tarefasIniciais.push(inicializarCategorias());
  }

  await Promise.all(tarefasIniciais);

  await initDesejos();
  await initTransacoes();

  const tarefasConta = [];
  if ($('contas')) {
    tarefasConta.push(listarContas());
  }

  if ($('carteiraSaldo')) {
    tarefasConta.push(initCarteiraPage());
  }

  if ($('conta')) {
    tarefasConta.push(popularSelectContas());
  }

  if (tarefasConta.length) {
    await Promise.all(tarefasConta);
  }

  if ($('formConta')) {
    criarConta('formConta', async () => {
      await popularSelectContas();
    });
  }

  await initSalario();

  // Aplica máscara de moeda nos inputs marcados com data-moeda.
  await bindCurrencyInputs();
}

initApp();
