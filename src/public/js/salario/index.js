import { $ } from '../helpers/index.js';
import { listarContas } from '../conta.js';
import { carregarResumo } from '../inicio.js';
import { criarSalario } from './form.js';
import {
  listarSalarios,
  invalidarEListarSalarios,
  extractSalarioAction,
  extractSalarioId,
  extractSalarioMeta,
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
      const meta = extractSalarioMeta(event);
      const contas = await listarContas();
      await abrirModalEditarSalario({
        id,
        valor: meta.valor,
        diaRecebimento: meta.dia,
        destinoAtual: meta.destino,
        contas,
        onAtualizar: async () => {
          await invalidarEListarSalarios();
          await atualizarVisoesRelacionadas();
        },
      });
      return;
    }

    if (action === 'deletar') {
      await abrirModalDeletarSalario({
        id,
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
