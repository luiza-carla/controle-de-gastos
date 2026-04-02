import { $ } from '../helpers/index.js';
import { listarContas } from '../conta.js';
import { carregarResumo } from '../inicio.js';
import { criarSalario } from './form.js';
import {
  listarSalarios,
  invalidarEListarSalarios,
  extractSalarioAction,
  extractSalarioId,
  extractSalarioDados,
} from './render.js';
import { abrirModalEditarSalario, abrirModalDeletarSalario } from './modal.js';

// Atualiza telas que dependem de contas e resumo
async function atualizarVisoesRelacionadas() {
  if ($('contas')) {
    await listarContas();
  }

  if ($('saldoAtual') || $('saldoCalculado')) {
    await carregarResumo();
  }
}

function bindSalarioAcoes() {
  const container = $('salariosContainer');
  if (!container) return;

  container.addEventListener('click', async (event) => {
    const action = extractSalarioAction(event);
    const id = extractSalarioId(event);
    if (!action || !id) return;

    if (action === 'editar') {
      const dadosSalario = extractSalarioDados(event);
      const contas = await listarContas();
      await abrirModalEditarSalario({
        id,
        valor: dadosSalario.valor,
        diaRecebimento: dadosSalario.dia,
        destinoAtual: dadosSalario.destino,
        contas,
        onAtualizar: async () => {
          await invalidarEListarSalarios();
          await atualizarVisoesRelacionadas();
        },
      });
      return;
    }

    if (action === 'deletar') {
      const dadosSalario = extractSalarioDados(event);
      await abrirModalDeletarSalario({
        id,
        valor: dadosSalario.valor,
        onAtualizar: async () => {
          await invalidarEListarSalarios();
          await atualizarVisoesRelacionadas();
        },
      });
      return;
    }
  });
}

export async function initSalario() {
  if ($('salariosContainer')) {
    await listarSalarios();
    bindSalarioAcoes();
  }

  if ($('formSalario')) {
    criarSalario('formSalario', async () => {
      await invalidarEListarSalarios();
      await atualizarVisoesRelacionadas();
    });
  }
}
