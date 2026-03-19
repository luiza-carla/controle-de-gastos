import { getToken } from './config.js';
import { adicionarMenu } from './menu.js';
import { getPaginaAtual } from './helpers/index.js';

// Verifica autenticação e redireciona se necessário
export async function verificarAutenticacao() {
  const token = getToken();
  // Obtém nome da página atual
  const pagina = getPaginaAtual();
  // Páginas que não requerem autenticação
  const paginasPublicas = ['login.html', 'registrar.html'];

  // Redireciona para login se não autenticado
  if (!token && !paginasPublicas.includes(pagina)) {
    window.location.href = '/html/login.html';
    return false;
  }

  // Redireciona para início se já autenticado
  if (token && paginasPublicas.includes(pagina)) {
    window.location.href = '/html/inicio.html';
    return false;
  }

  // Carrega menu se autenticado
  if (token) {
    adicionarMenu().catch(() => undefined);
    return true;
  }

  return false;
}
