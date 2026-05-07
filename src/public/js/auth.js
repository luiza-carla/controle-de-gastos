import { verificarSessaoAtiva } from './config.js';
import { adicionarMenu } from './menu.js';
import { getPaginaAtual } from './helpers/index.js';

// Verifica autenticação e redireciona se necessário
export async function verificarAutenticacao() {
  const pagina = getPaginaAtual();
  const paginasPublicas = ['login.html', 'registrar.html'];
  const sessao = await verificarSessaoAtiva().catch(() => false);
  const autenticado = Boolean(sessao?.autenticado);

  if (!autenticado && !paginasPublicas.includes(pagina)) {
    window.location.href = '/html/login.html';
    return false;
  }

  if (autenticado && paginasPublicas.includes(pagina)) {
    window.location.href = '/html/inicio.html';
    return false;
  }

  if (autenticado) {
    adicionarMenu().catch(() => undefined);
    return true;
  }

  return false;
}
