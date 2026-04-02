import {
  criarMensagemOperacao,
  mostrarNotificacao,
  tratarErro,
} from '../notification.js';
import { mostrarErroInline } from '../modalEditar.js';

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
    const msg = tratarErro(err, mensagemErro);
    mostrarErroInline(msg);
  }
}
