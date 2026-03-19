import { tratarErro } from '../notification.js';
import { mostrarErroInline } from '../modalEditar.js';

/**
 * Executa uma ação de modal com tratamento de erro padrão.
 *
 * @param {object} options
 * @param {() => Promise<any>} options.acao - Função async que executa a ação (API, CRUD etc.)
 * @param {string} options.mensagemErro - Mensagem padrão ao tratar o erro.
 * @param {() => any} [options.onAtualizar] - Callback opcional executado em caso de sucesso.
 */
export async function executarAcaoModal({ acao, mensagemErro, onAtualizar }) {
  try {
    await acao();
    onAtualizar?.();
  } catch (err) {
    const msg = tratarErro(err, mensagemErro);
    mostrarErroInline(msg);
  }
}
