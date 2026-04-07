import { apiFetch } from '../config.js';
import {
  abrirModal,
  fecharModal,
  mostrarErroInline,
  limparErroInline,
} from '../modalEditar.js';
import {
  executarAcaoModal,
  formatarValor,
  capitalizar,
  escaparHtml,
  criarOptionsHTML,
  filtrarContasNaoCredito,
  $,
} from '../helpers/index.js';
import {
  templateAdicionarDinheiro,
  templateRemoverDinheiro,
  templateTransferencia,
} from './templates.js';
import {
  validarSaldoDisponivel,
  validarValorParaOperacao,
} from './validators.js';
import { atualizarCarteira, transferirParaConta } from './api.js';
import {
  erroUsuario,
  mostrarNotificacao,
  tratarErro,
} from '../notification.js';
import { obterCarteira, invalidateCarteira } from './service.js';

const URL_CONTAS = `${window.location.origin}/contas`;

export async function abrirModalAdicionarDinheiro({ onAtualizar } = {}) {
  limparErroInline();

  abrirModal({
    titulo: 'Adicionar dinheiro',
    conteudoHTML: templateAdicionarDinheiro(),
    onSalvar: async () => {
      const valorResult = validarValorParaOperacao(
        $('modalValorDinheiro')?.value
      );

      if (!valorResult.valido) {
        mostrarErroInline(valorResult.mensagem);
        return;
      }

      await executarAcaoModal({
        acao: () => atualizarCarteira(valorResult.valor),
        mensagemErro: 'Erro ao adicionar dinheiro',
        notificacaoSucesso: {
          objeto: 'Dinheiro na carteira',
          acao: 'adicao',
          genero: 'masculino',
        },
        onAtualizar: async () => {
          invalidateCarteira();
          fecharModal();
          if (onAtualizar) await onAtualizar();
        },
      });
    },
  });
}

export async function abrirModalRemoverDinheiro({ onAtualizar } = {}) {
  limparErroInline();

  const carteira = await obterCarteira();
  const saldoFormatado = carteira ? formatarValor(carteira.saldo) : '0,00';

  abrirModal({
    titulo: 'Remover dinheiro',
    conteudoHTML: templateRemoverDinheiro(saldoFormatado),
    onSalvar: async () => {
      const valorResult = validarValorParaOperacao(
        $('modalValorRemover')?.value
      );
      if (!valorResult.valido) {
        mostrarErroInline(valorResult.mensagem);
        return;
      }

      const saldoAtual = carteira?.saldo ?? 0;
      const saldoValido = validarSaldoDisponivel(valorResult.valor, saldoAtual);
      if (!saldoValido.valido) {
        const msg = tratarErro(
          erroUsuario(saldoValido.mensagem),
          saldoValido.mensagem
        );
        mostrarErroInline(msg);
        return;
      }

      await executarAcaoModal({
        acao: () => atualizarCarteira(-valorResult.valor),
        mensagemErro: 'Erro ao remover dinheiro',
        notificacaoSucesso: {
          objeto: 'Dinheiro da carteira',
          acao: 'remocao',
          genero: 'masculino',
        },
        onAtualizar: async () => {
          invalidateCarteira();
          fecharModal();
          if (onAtualizar) await onAtualizar();
        },
      });
    },
  });
}

export async function abrirModalTransferencia({ onAtualizar } = {}) {
  limparErroInline();

  const carteira = await obterCarteira();
  const contas = await apiFetch(URL_CONTAS);
  const contasDisponiveis = filtrarContasNaoCredito(contas || []);

  if (!contasDisponiveis.length) {
    mostrarNotificacao(
      'Você precisa ter pelo menos uma conta para transferir',
      'erro'
    );
    return;
  }

  const saldoFormatado = carteira ? formatarValor(carteira.saldo) : '0,00';
  const contasOptionsHtml = criarOptionsHTML(
    contasDisponiveis,
    (c) => c._id,
    (c) => `${escaparHtml(c.nome)} (${capitalizar(c.tipo)})`
  );

  abrirModal({
    titulo: 'Transferir para conta',
    conteudoHTML: templateTransferencia(saldoFormatado, contasOptionsHtml),
    onSalvar: async () => {
      const contaId = $('modalContaTransferencia')?.value;
      const valorResult = validarValorParaOperacao(
        $('modalValorTransferencia')?.value
      );

      if (!contaId || !valorResult.valido) {
        const msg = tratarErro(
          erroUsuario('Preencha o campo com um valor válido'),
          'Preencha o campo com um valor válido'
        );
        mostrarErroInline(msg);
        return;
      }

      const saldoAtual = carteira?.saldo ?? 0;
      const saldoValido = validarSaldoDisponivel(valorResult.valor, saldoAtual);
      if (!saldoValido.valido) {
        const msg = tratarErro(
          erroUsuario(saldoValido.mensagem),
          saldoValido.mensagem
        );
        mostrarErroInline(msg);
        return;
      }

      const contaDestino = contasDisponiveis.find(
        (conta) => conta._id === contaId
      );

      await executarAcaoModal({
        acao: () => transferirParaConta(contaId, valorResult.valor),
        mensagemErro: 'Erro ao transferir dinheiro',
        notificacaoSucesso: {
          objeto: `Transferência da carteira para ${contaDestino?.nome ? `a conta "${contaDestino.nome}"` : 'uma conta'}`,
          acao: 'transferencia',
          genero: 'feminino',
        },
        onAtualizar: async () => {
          invalidateCarteira();
          fecharModal();
          if (onAtualizar) await onAtualizar();
        },
      });
    },
  });
}
