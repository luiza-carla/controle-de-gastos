import {
  abrirModal,
  fecharModal,
  mostrarErroInline,
  limparErroInline,
} from '../modalEditar.js';
import { abrirModalConfirmacao } from '../modalDeletar.js';
import { executarAcaoModal } from '../helpers/index.js';
import { parseCurrency } from '../helpers/index.js';
import {
  updateConta,
  deleteConta,
  transferirEntreContas,
  transferirParaCarteira,
} from './api.js';
import { templateEditarConta, templateTransferirConta } from './templates.js';

const VALOR_CARTEIRA = 'carteira';

export async function abrirModalEditarConta(
  id,
  { obterContas, carregarERenderizarContas }
) {
  const contas = await obterContas();
  const conta = contas.find((c) => c._id === id);
  if (!conta) return;

  abrirModal({
    titulo: 'Editar conta',
    conteudoHTML: templateEditarConta(conta),
    onSalvar: async () => {
      limparErroInline();

      const novoNome = document.getElementById('modalNomeConta')?.value;
      const novoTipo = document.getElementById('modalTipoConta')?.value;

      if (!novoNome || !novoTipo) {
        mostrarErroInline('Por favor, preencha todos os campos obrigatórios');
        return;
      }

      await executarAcaoModal({
        acao: () => updateConta(id, { nome: novoNome, tipo: novoTipo }),
        mensagemErro: 'Erro ao atualizar conta',
        onAtualizar: async () => {
          fecharModal();
          await carregarERenderizarContas();
        },
      });
    },
  });
}

export async function abrirModalDeletarConta(
  id,
  { carregarERenderizarContas }
) {
  abrirModalConfirmacao({
    titulo: 'Confirmar exclusão',
    mensagem: 'Tem certeza que deseja deletar esta conta?',
    onConfirmar: async () => {
      await executarAcaoModal({
        acao: () => deleteConta(id),
        mensagemErro: 'Erro ao excluir conta',
        onAtualizar: async () => {
          fecharModal();
          await carregarERenderizarContas();
        },
      });
    },
  });
}

export async function abrirModalTransferirConta(
  contaOrigemId,
  { obterContas, atualizarSaldosTela }
) {
  const contas = await obterContas();
  const contaOrigem = contas.find((c) => c._id === contaOrigemId);
  if (!contaOrigem) return;

  const outrasContas = contas.filter((c) => c._id !== contaOrigemId);

  const optionsCarteira = `<option value="${VALOR_CARTEIRA}">Dinheiro físico</option>`;
  const optionsContas = outrasContas
    .map((c) => `<option value="${c._id}">${c.nome} (${c.tipo})</option>`)
    .join('');

  abrirModal({
    titulo: 'Transferir de conta',
    conteudoHTML: templateTransferirConta(
      contaOrigem,
      `${optionsCarteira}${optionsContas}`,
      contaOrigem.saldo
    ),
    onSalvar: async () => {
      const destino = document.getElementById('modalContaDestino')?.value;
      const valor = parseCurrency(
        document.getElementById('modalValorTransferenciaConta')?.value
      );

      limparErroInline();

      if (!destino || !valor || valor <= 0) {
        mostrarErroInline('Preencha todos os campos com valores válidos');
        return;
      }

      if (valor > contaOrigem.saldo) {
        mostrarErroInline('Saldo insuficiente na conta');
        return;
      }

      await executarAcaoModal({
        acao: async () => {
          if (destino === VALOR_CARTEIRA) {
            await transferirParaCarteira(contaOrigemId, valor);
          } else {
            await transferirEntreContas(contaOrigemId, destino, valor);
          }
        },
        mensagemErro: 'Erro ao transferir',
        onAtualizar: async () => {
          fecharModal();
          await atualizarSaldosTela();
        },
      });
    },
  });
}
