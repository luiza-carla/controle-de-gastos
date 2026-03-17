import { verificarAutenticacao } from './auth.js';
import { criarConta, popularSelectContas, listarContas } from './conta.js';
import { exibirCarteira } from './carteira.js';
import { inicializarCategorias } from './categoria.js';
import { criarTransacao, listarTransacoes } from './transacao.js';
import { criarDesejo, listarDesejos } from './listaDesejo.js';
import { criarSalario, listarSalarios } from './salario.js';
import { carregarResumo } from './inicio.js';
import { $, bindCurrencyInputs } from './helpers/index.js';

(async function () {
  await verificarAutenticacao();

  await Promise.all([
    import('./modalEditar.js'),
    // Inicializa categorias
    inicializarCategorias(),
  ]);
})();

// Inicializa transações
(async function () {
  if ($('formTransacao')) {
    criarTransacao('formTransacao');
  }

  if ($('transacoes')) {
    await listarTransacoes();
  }
})();

// Inicializa contas
(async function () {
  const tarefas = [];

  if ($('contas')) {
    tarefas.push(listarContas());
  }

  if ($('carteiraSaldo')) {
    tarefas.push(exibirCarteira());
  }

  if ($('conta')) {
    tarefas.push(popularSelectContas());
  }

  if (tarefas.length) {
    await Promise.all(tarefas);
  }

  if ($('formConta')) {
    criarConta('formConta', async () => {
      await popularSelectContas();
    });
  }
})();

// Inicializa lista de desejos
(async function () {
  if ($('formListaDesejo')) {
    criarDesejo('formListaDesejo');
  }

  if ($('listaDesejos')) {
    await listarDesejos();
  }
})();

// Inicializa resumo financeiro
(async function () {
  if ($('saldoAtual') || $('saldoCalculado')) {
    await carregarResumo();
  }
})();

// Inicializa salarios
(async function () {
  const tarefas = [];

  if ($('salariosContainer')) {
    tarefas.push(listarSalarios());
  }

  if ($('contaSalario')) {
    tarefas.push(popularSelectContas('contaSalario'));
  }

  if (tarefas.length) {
    await Promise.all(tarefas);
  }

  if ($('formSalario')) {
    criarSalario('formSalario');
  }
})();

// Aplica máscara de moeda nos inputs marcados com data-moeda.
(async function () {
  await bindCurrencyInputs();
})();
