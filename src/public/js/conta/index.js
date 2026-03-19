import {
  renderContas,
  renderSelectContas,
  bindContaActions,
} from './render.js';
import {
  abrirModalEditarConta,
  abrirModalDeletarConta,
  abrirModalTransferirConta,
} from './modal.js';
import { obterContas } from './service.js';
import { criarConta } from './form.js';

let eventosContasVinculados = false;

export async function initContasPage() {
  await carregarERenderizarContas();
}

export async function carregarERenderizarContas() {
  const contas = await obterContas();
  renderContas(contas);

  if (!eventosContasVinculados) {
    bindEventosContas();
    eventosContasVinculados = true;
  }

  return contas;
}

export async function popularSelectContas(
  selectId = 'conta',
  carteiraSaldoLabel = ''
) {
  const contas = await obterContas();
  renderSelectContas(selectId, contas, carteiraSaldoLabel);
}

export async function atualizarSaldosTela() {
  await carregarERenderizarContas();
}

function bindEventosContas() {
  bindContaActions('contas', async (action, contaId) => {
    if (action === 'editar') {
      await abrirModalEditarConta(contaId, {
        obterContas,
        carregarERenderizarContas,
      });
      return;
    }

    if (action === 'transferir') {
      await abrirModalTransferirConta(contaId, {
        obterContas,
        atualizarSaldosTela,
      });
      return;
    }

    if (action === 'deletar') {
      await abrirModalDeletarConta(contaId, {
        carregarERenderizarContas,
      });
      return;
    }
  });
}

export { criarConta };
