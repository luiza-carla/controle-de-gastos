import { error as loggerError } from './helpers/logger.js';

const ICONES_NOTIFICACAO = {
  sucesso: 'fa-circle-check',
  erro: 'fa-circle-xmark',
  aviso: 'fa-triangle-exclamation',
};

const CHAVE_NOTIFICACAO_PENDENTE = 'notificacaoPendente';

//Erro que pode ser mostrado ao usuário
export function erroUsuario(mensagem) {
  const erro = new Error(mensagem);
  erro.__mostrarAoUsuario = true;
  return erro;
}

function isErroUsuario(error) {
  return !!(error && error.__mostrarAoUsuario);
}

/**
 * Trata um erro: se for um erro destinado ao usuário, exibe uma notificação.
 * Caso contrário, apenas registra no logger.
 *
 * @param {unknown} error - Objeto de erro (pode ser Error/any)
 * @param {string} mensagemPadrao - Texto a ser usado se não houver mensagem no erro
 */
export function tratarErro(error, mensagemPadrao = 'Ocorreu um erro') {
  const isUsuario = isErroUsuario(error);
  const mensagem = isUsuario
    ? (error && error.message) || mensagemPadrao
    : mensagemPadrao;

  if (isUsuario) {
    mostrarNotificacao(mensagem, 'erro');
  } else {
    loggerError('Erro interno:', 'notification', error);
  }

  return mensagem;
}

/**
 * Mostra uma notificação temporária na tela
 * @param {string} mensagem - Mensagem a ser exibida
 * @param {string} tipo - Tipo da notificação: 'sucesso', 'erro', 'aviso' (padrão: 'sucesso')
 * @param {number} duracao - Duração em milissegundos (padrão: 3000)
 */

export function mostrarNotificacao(mensagem, tipo = 'sucesso', duracao = 3000) {
  // Criar container da notificação
  const notificacao = document.createElement('div');
  notificacao.className = `notificacao notificacao-${tipo}`;

  const icone = ICONES_NOTIFICACAO[tipo] || ICONES_NOTIFICACAO.sucesso;

  notificacao.innerHTML = `
    <i class="fa-solid ${icone}"></i>
    <span>${mensagem}</span>
  `;

  // Adicionar à página
  document.body.appendChild(notificacao);

  // Animar entrada
  setTimeout(() => {
    notificacao.classList.add('notificacao-visivel');
  }, 10);

  // Remover notificação após duração
  setTimeout(() => {
    notificacao.classList.remove('notificacao-visivel');
    setTimeout(() => {
      notificacao.remove();
    }, 300);
  }, duracao);
}

export function persistirNotificacaoParaProximaTela(
  mensagem,
  tipo = 'sucesso',
  duracao = 3000
) {
  try {
    const payload = {
      mensagem,
      tipo,
      expiraEm: Date.now() + duracao,
    };
    sessionStorage.setItem(CHAVE_NOTIFICACAO_PENDENTE, JSON.stringify(payload));
  } catch {
    // Ignora falhas de storage e segue sem persistir notificacao
  }
}

function exibirNotificacaoPersistida() {
  try {
    const bruto = sessionStorage.getItem(CHAVE_NOTIFICACAO_PENDENTE);
    if (!bruto) return;

    sessionStorage.removeItem(CHAVE_NOTIFICACAO_PENDENTE);

    const payload = JSON.parse(bruto);
    const restante = Number(payload.expiraEm) - Date.now();

    if (!payload?.mensagem || restante <= 0) return;

    mostrarNotificacao(payload.mensagem, payload.tipo || 'sucesso', restante);
  } catch {
    sessionStorage.removeItem(CHAVE_NOTIFICACAO_PENDENTE);
  }
}

exibirNotificacaoPersistida();
