import { error as loggerError } from './helpers/logger.js';
import { $ } from './helpers/dom.js';

const ICONES_NOTIFICACAO = {
  sucesso: 'fa-circle-check',
  erro: 'fa-circle-xmark',
  aviso: 'fa-triangle-exclamation',
};

const RADICAIS_OPERACAO = {
  adicao: 'adicionad',
  criacao: 'criad',
  atualizacao: 'atualizad',
  delecao: 'deletad',
  remocao: 'removid',
  transferencia: 'transferid',
  realizacao: 'realizad',
};

const CHAVE_NOTIFICACAO_PENDENTE = 'notificacaoPendente';
const ID_CONTAINER_NOTIFICACOES = 'notificacoesContainer';
const MENSAGENS_ERRO_INLINE_CONHECIDAS = new Set([
  'Saldo insuficiente na carteira',
]);

// Extrai uma mensagem textual utilizavel a partir de um erro.
function obterMensagemErro(error) {
  const mensagem = error?.message?.trim();
  return mensagem || null;
}

// Garante a existencia do container global de notificacoes.
function obterContainerNotificacoes() {
  let container = $(ID_CONTAINER_NOTIFICACOES);
  if (container) return container;

  container = document.createElement('div');
  container.id = ID_CONTAINER_NOTIFICACOES;
  container.className = 'notificacoes-container';
  document.body.appendChild(container);
  return container;
}

//Erro que pode ser mostrado ao usuário
export function erroUsuario(mensagem) {
  const erro = new Error(mensagem);
  erro.__mostrarAoUsuario = true;
  return erro;
}

function isErroHttpUsuario(error) {
  const statusCode = Number(error?.statusCode);
  return statusCode >= 400 && statusCode < 500;
}

function isErroUsuario(error) {
  return !!(error && error.__mostrarAoUsuario);
}

// Resolve a mensagem que deve ser mostrada para erros de usuario.
function extrairMensagemErroUsuario(error) {
  if (isErroUsuario(error)) {
    return obterMensagemErro(error);
  }

  if (isErroHttpUsuario(error)) {
    return obterMensagemErro(error);
  }

  return null;
}

// Retorna mensagens que devem ser exibidas inline em formularios/modais.
export function extrairMensagemErroInline(error) {
  if (isErroUsuario(error)) {
    return obterMensagemErro(error);
  }

  const mensagem = obterMensagemErro(error);
  if (!mensagem) return null;

  return MENSAGENS_ERRO_INLINE_CONHECIDAS.has(mensagem) ? mensagem : null;
}

/**
 * Trata um erro: se for um erro destinado ao usuário, exibe uma notificação.
 * Caso contrário, apenas registra no logger.
 *
 * @param {unknown} error - Objeto de erro (pode ser Error/any)
 * @param {string} mensagemPadrao - Texto a ser usado se não houver mensagem no erro
 */
export function tratarErro(error, mensagemPadrao = 'Ocorreu um erro') {
  const mensagemUsuario = extrairMensagemErroUsuario(error);
  const mensagemInline = extrairMensagemErroInline(error);
  const isUsuario = !!mensagemUsuario;
  const isEsperado = isUsuario || !!mensagemInline;
  const mensagem = mensagemUsuario || mensagemPadrao;

  if (isErroUsuario(error)) {
    mostrarNotificacao(mensagem, 'erro');
  } else if (!isEsperado) {
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
  const container = obterContainerNotificacoes();
  const notificacao = document.createElement('div');
  notificacao.className = `notificacao notificacao-${tipo}`;

  const icone = ICONES_NOTIFICACAO[tipo] || ICONES_NOTIFICACAO.sucesso;

  const iconeEl = document.createElement('i');
  iconeEl.className = `fa-solid ${icone}`;

  const textoEl = document.createElement('span');
  textoEl.textContent = mensagem;

  notificacao.appendChild(iconeEl);
  notificacao.appendChild(textoEl);

  container.prepend(notificacao);

  // Animar entrada
  requestAnimationFrame(() => {
    notificacao.classList.add('notificacao-visivel');
  });

  // Remover notificação após duração
  setTimeout(() => {
    notificacao.classList.remove('notificacao-visivel');
    setTimeout(() => {
      notificacao.remove();

      if (!container.childElementCount) {
        container.remove();
      }
    }, 300);
  }, duracao);
}

export function criarMensagemOperacao({ objeto, acao, genero = 'masculino' }) {
  const generoNormalizado = genero === 'feminino' ? 'feminino' : 'masculino';
  const radical = RADICAIS_OPERACAO[acao] || RADICAIS_OPERACAO.atualizacao;
  const sufixo = generoNormalizado === 'feminino' ? 'a' : 'o';
  const participio = `${radical}${sufixo}`;
  const objetoNormalizado = (objeto || 'Item').trim();

  return `${objetoNormalizado} ${participio} com sucesso!`;
}

export function notificarOperacao(opcoes, duracao = 3000) {
  const mensagem = criarMensagemOperacao(opcoes);
  mostrarNotificacao(mensagem, 'sucesso', duracao);
  return mensagem;
}

// Persiste uma notificacao para ser exibida apos redirecionamento.
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

// Agenda uma notificacao de sucesso para a proxima tela.
export function agendarNotificacaoOperacao(opcoes, duracao = 3000) {
  const mensagem = criarMensagemOperacao(opcoes);
  persistirNotificacaoParaProximaTela(mensagem, 'sucesso', duracao);
  return mensagem;
}

// Reexibe notificacoes persistidas apos navegacao entre telas.
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
