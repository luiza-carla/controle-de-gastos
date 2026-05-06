import { error as loggerError, warn as loggerWarn } from './helpers/logger.js';
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

const STATUS_ERRO_USUARIO = new Set([400, 401, 404, 409]);

const MENSAGENS_ERRO_INLINE_CONHECIDAS = new Set([
  'Saldo insuficiente na carteira',
  'Saldo insuficiente na conta',
  'Limite insuficiente no cartão de crédito',
  'Não é permitido lançar entradas em cartão de crédito',
  'Transferências com cartão de crédito não são permitidas',
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

// Erro que pode ser mostrado ao usuário
export function erroUsuario(mensagem, statusCode = 400) {
  const erro = new Error(mensagem);
  erro.statusCode = statusCode;
  erro.__mostrarAoUsuario = true;
  return erro;
}

// Resolve mensagem de erro para exibição geral
function extrairMensagemErroUsuario(error) {
  const mensagem = obterMensagemErro(error);
  if (!mensagem) return null;

  if (error?.__mostrarAoUsuario === true) return mensagem;

  const status = Number(error?.statusCode);
  if (STATUS_ERRO_USUARIO.has(status)) return mensagem;

  return null;
}

// Mensagens específicas para exibição inline
export function extrairMensagemErroInline(error) {
  if (error?.__mostrarAoUsuario === true) {
    return obterMensagemErro(error);
  }

  const mensagem = obterMensagemErro(error);
  if (!mensagem) return null;

  return MENSAGENS_ERRO_INLINE_CONHECIDAS.has(mensagem) ? mensagem : null;
}

/**
 * Trata um erro: decide a mensagem e registra no log.
 */
export function tratarErro(error, mensagemPadrao = 'Ocorreu um erro') {
  const mensagemUsuario = extrairMensagemErroUsuario(error);
  const mensagemInline = extrairMensagemErroInline(error);

  const mensagemFinal = mensagemInline || mensagemUsuario || mensagemPadrao;

  const isEsperado = !!mensagemUsuario || !!mensagemInline;

  if (!isEsperado) {
    loggerError('Erro interno:', 'notification', error);
  } else {
    loggerWarn('Erro esperado:', 'notification', error);
  }

  return mensagemFinal;
}

/**
 * Mostra uma notificação temporária na tela
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
