import {
  abrirModal,
  fecharModal,
  mostrarErroInline,
  limparErroInline,
} from '../modalEditar.js';
import { abrirModalConfirmacao } from '../modalDeletar.js';
import {
  executarAcaoModal,
  parseCurrency,
  criarOptionsHTML,
  formatarItemComTipo,
  contaEhCredito,
  filtrarContasNaoCredito,
  $,
} from '../helpers/index.js';
import {
  updateConta,
  deleteConta,
  transferirEntreContas,
  transferirParaCarteira,
} from './api.js';
import { invalidateContas } from './service.js';
import { templateEditarConta, templateTransferirConta } from './templates.js';
import { mostrarNotificacao } from '../notification.js';
import { normalizarDinheiro, somarDinheiro } from '../helpers/money.js';

const VALOR_CARTEIRA = 'carteira';
const MENSAGEM_TRANSFERENCIA_CREDITO =
  'Transferências com cartão de crédito não são permitidas';

function obterSaldoDisponivelTransferencia(conta) {
  if (contaEhCredito(conta)) {
    return somarDinheiro(conta.limite || 0, conta.saldo || 0);
  }

  return normalizarDinheiro(conta.saldo || 0);
}

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

      const novoNome = $('modalNomeConta')?.value;

      if (!novoNome) {
        mostrarErroInline('Por favor, preencha todos os campos obrigatórios');
        return;
      }

      await executarAcaoModal({
        acao: () => updateConta(id, { nome: novoNome }),
        mensagemErro: 'Erro ao atualizar conta',
        notificacaoSucesso: {
          objeto: `Conta "${novoNome}"`,
          acao: 'atualizacao',
          genero: 'feminino',
        },
        onAtualizar: async () => {
          invalidateContas();
          fecharModal();
          await carregarERenderizarContas();
        },
      });
    },
  });
}

export async function abrirModalDeletarConta(
  id,
  { obterContas, carregarERenderizarContas }
) {
  const contas = await obterContas();
  const conta = contas.find((item) => item._id === id);

  abrirModalConfirmacao({
    titulo: 'Confirmar exclusão',
    mensagem: 'Tem certeza que deseja deletar esta conta?',
    onConfirmar: async () => {
      await executarAcaoModal({
        acao: () => deleteConta(id),
        mensagemErro: 'Erro ao excluir conta',
        notificacaoSucesso: {
          objeto: conta?.nome ? `Conta "${conta.nome}"` : 'Conta',
          acao: 'delecao',
          genero: 'feminino',
        },
        onAtualizar: async () => {
          invalidateContas();
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

  if (contaEhCredito(contaOrigem)) {
    mostrarNotificacao(MENSAGEM_TRANSFERENCIA_CREDITO, 'erro');
    return;
  }

  const outrasContas = filtrarContasNaoCredito(contas).filter(
    (c) => c._id !== contaOrigemId
  );

  const optionsCarteira = '<option value="carteira">Dinheiro físico</option>';
  const optionsContas = criarOptionsHTML(
    outrasContas,
    (conta) => conta._id,
    (conta) => formatarItemComTipo(conta)
  );

  abrirModal({
    titulo: 'Transferir de conta',
    conteudoHTML: templateTransferirConta(
      contaOrigem,
      `${optionsCarteira}${optionsContas}`,
      contaOrigem.saldo
    ),
    onSalvar: async () => {
      const destino = $('modalContaDestino')?.value;
      const valor = parseCurrency($('modalValorTransferenciaConta')?.value);

      limparErroInline();

      if (!destino || !valor || valor <= 0) {
        mostrarErroInline('Preencha todos os campos com valores válidos');
        return;
      }

      if (valor > obterSaldoDisponivelTransferencia(contaOrigem)) {
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
        notificacaoSucesso: {
          objeto:
            destino === VALOR_CARTEIRA
              ? `Transferência da conta "${contaOrigem.nome}" para a carteira`
              : `Transferência da conta "${contaOrigem.nome}" para a conta "${
                  contas.find((conta) => conta._id === destino)?.nome || ''
                }"`,
          acao: 'transferencia',
          genero: 'feminino',
        },
        onAtualizar: async () => {
          invalidateContas();
          fecharModal();
          await atualizarSaldosTela();
        },
      });
    },
  });
}
