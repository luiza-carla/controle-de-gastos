import { apiFetch } from '../config.js';
import {
  abrirModal,
  fecharModal,
  mostrarErroInline,
  limparErroInline,
} from '../modalEditar.js';
import {
  formatarValor,
  capitalizar,
  escaparHtml,
  criarOptionsHTML,
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

export async function abrirModalAdicionarDinheiro({ onSuccess } = {}) {
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

      try {
        await atualizarCarteira(valorResult.valor);
        invalidateCarteira();
        fecharModal();
        if (onSuccess) await onSuccess();
      } catch (err) {
        const msg = tratarErro(err, 'Erro ao adicionar dinheiro');
        mostrarErroInline(msg);
      }
    },
  });
}

export async function abrirModalRemoverDinheiro({ onSuccess } = {}) {
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

      try {
        await atualizarCarteira(-valorResult.valor);
        invalidateCarteira();
        fecharModal();
        if (onSuccess) await onSuccess();
      } catch (err) {
        const msg = tratarErro(err, 'Erro ao remover dinheiro');
        mostrarErroInline(msg);
      }
    },
  });
}

export async function abrirModalTransferencia({ onSuccess } = {}) {
  limparErroInline();

  const carteira = await obterCarteira();
  const contas = await apiFetch(URL_CONTAS);

  if (!contas || contas.length === 0) {
    mostrarNotificacao(
      'Você precisa ter pelo menos uma conta para transferir',
      'erro'
    );
    return;
  }

  const saldoFormatado = carteira ? formatarValor(carteira.saldo) : '0,00';
  const contasOptionsHtml = criarOptionsHTML(
    contas,
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

      try {
        await transferirParaConta(contaId, valorResult.valor);
        invalidateCarteira();
        fecharModal();
        if (onSuccess) await onSuccess();
      } catch (err) {
        const msg = tratarErro(err, 'Erro ao transferir dinheiro');
        mostrarErroInline(msg);
      }
    },
  });
}
