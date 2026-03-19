import { verificarAutenticacao } from './auth.js';
import { criarConta, popularSelectContas, listarContas } from './conta.js';
import { initCarteiraPage } from './carteira.js';
import { inicializarCategorias } from './categoria.js';
import { initDesejos } from './listaDesejo.js';
import { initTransacoes } from './transacao/index.js';
import { initSalario } from './salario/index.js';
import { carregarResumo } from './inicio.js';
import { $, bindCurrencyInputs } from './helpers/index.js';

async function initApp() {
  const autenticado = await verificarAutenticacao();
  if (!autenticado) return;

  // Módulos que só são usados quando o usuário está autenticado
  const tarefasIniciais = [import('./modalEditar.js')];

  const precisaCategorias =
    document.getElementById('buscaCategoria') ||
    document.getElementById('filtroBuscaCategoriaDesejo') ||
    document.getElementById('filtroCategoriaDesejo');

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

  if ($('saldoAtual') || $('saldoCalculado')) {
    await carregarResumo();
  }

  await initSalario();

  // Aplica máscara de moeda nos inputs marcados com data-moeda.
  await bindCurrencyInputs();
}

initApp();
