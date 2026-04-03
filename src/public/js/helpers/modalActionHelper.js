import {
  criarMensagemOperacao,
  mostrarNotificacao,
  tratarErro,
  extrairMensagemErroInline,
} from '../notification.js';
import { fecharModal, mostrarErroInline } from '../modalEditar.js';

export function notificarErroModal(mensagem) {
  fecharModal();
  mostrarNotificacao(mensagem, 'erro');
}

/**
 * Executa uma ação de modal com tratamento de erro padrão.
 *
 * @param {object} options
 * @param {() => Promise<any>} options.acao - Função async que executa a ação (API, CRUD etc.)
 * @param {string} options.mensagemErro - Mensagem padrão ao tratar o erro.
 * @param {object|string|((resultado: any) => object|string|null)} [options.notificacaoSucesso] - Configuração opcional da notificação de sucesso.
 * @param {() => any} [options.onAtualizar] - Callback opcional executado em caso de sucesso.
 */
export async function executarAcaoModal({
  acao,
  mensagemErro,
  notificacaoSucesso,
  onAtualizar,
}) {
  try {
    const resultado = await acao();

    await onAtualizar?.(resultado);

    const configNotificacao =
      typeof notificacaoSucesso === 'function'
        ? notificacaoSucesso(resultado)
        : notificacaoSucesso;

    if (configNotificacao) {
      const mensagem =
        typeof configNotificacao === 'string'
          ? configNotificacao
          : criarMensagemOperacao(configNotificacao);
      mostrarNotificacao(mensagem);
    }

    return resultado;
  } catch (err) {
    const mensagemUsuario =
      extrairMensagemErroInline(err) ||
      ((err?.statusCode || 0) >= 400 && (err?.statusCode || 0) < 500
        ? err?.message?.trim()
        : null);

    if (mensagemUsuario) {
      mostrarErroInline(mensagemUsuario);
      return;
    }

    const msg = tratarErro(err, mensagemErro);
    notificarErroModal(msg);
  }
}
