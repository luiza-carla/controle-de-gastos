import { logout } from './logout.js';
import { abrirModalConfirmacao, fecharModal } from './modalDeletar.js';
import { $, addClass, getPaginaAtual, setHTMLById } from './helpers/index.js';
import { mostrarNotificacao, tratarErro } from './notification.js';
import * as logger from './helpers/logger.js';

const MENU_CACHE_KEY = 'menuHtmlCacheV2';
const MENU_MAX_TENTATIVAS = 2;

function isMenuCacheValido(html) {
  if (!html || !html.trim()) {
    return false;
  }

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    const sidebar = doc.querySelector('.sidebar');
    const modalGlobal = doc.querySelector('#modalGlobal');
    const loadingOverlay = doc.querySelector('#loadingOverlay');
    const modalGlobalValido =
      modalGlobal?.classList.contains('modal-overlay') &&
      modalGlobal.classList.contains('is-hidden');
    const loadingOverlayValido =
      loadingOverlay?.classList.contains('modal-overlay') &&
      loadingOverlay.classList.contains('is-hidden');

    return Boolean(sidebar && modalGlobalValido && loadingOverlayValido);
  } catch (error) {
    logger.warn('Nao foi possivel validar cache do menu', 'menu', error);
    return false;
  }
}

function lerMenuDoCache() {
  try {
    const html = sessionStorage.getItem(MENU_CACHE_KEY);
    return isMenuCacheValido(html) ? html : null;
  } catch (error) {
    logger.warn('Nao foi possivel ler cache do menu', 'menu', error);
    return null;
  }
}

function salvarMenuNoCache(html) {
  try {
    sessionStorage.setItem(MENU_CACHE_KEY, html);
  } catch (error) {
    logger.warn('Nao foi possivel salvar cache do menu', 'menu', error);
  }
}

async function carregarHtmlMenu() {
  const htmlEmCache = lerMenuDoCache();
  if (htmlEmCache) {
    return htmlEmCache;
  }

  let ultimoErro = null;

  for (let tentativa = 1; tentativa <= MENU_MAX_TENTATIVAS; tentativa += 1) {
    try {
      const res = await fetch('/html/menu.html', { cache: 'no-store' });
      if (!res.ok) {
        throw new Error(`Falha ao buscar menu (HTTP ${res.status})`);
      }

      const html = await res.text();
      if (!html || !html.trim()) {
        throw new Error('HTML do menu veio vazio');
      }

      if (!isMenuCacheValido(html)) {
        throw new Error('HTML do menu veio em formato inesperado');
      }

      salvarMenuNoCache(html);
      return html;
    } catch (error) {
      ultimoErro = error;
    }
  }

  throw ultimoErro || new Error('Nao foi possivel carregar menu');
}

function renderizarFallbackMenu(menuDiv) {
  if (!menuDiv) {
    return;
  }

  menuDiv.innerHTML = `
    <div class="sidebar">
      <div class="menu-fallback">Nao foi possivel carregar o menu. Recarregue a pagina.</div>
    </div>
  `;
}

// Adiciona menu de navegação ao topo da página
export async function adicionarMenu() {
  let menuDiv = $('menu');
  // Cria div do menu se não existir
  if (!menuDiv) {
    menuDiv = document.createElement('div');
    menuDiv.id = 'menu';
    document.body.insertAdjacentElement('afterbegin', menuDiv);
  }

  // Reutiliza menu já renderizado para evitar trabalho duplicado.
  if (!menuDiv.querySelector('.sidebar')) {
    try {
      const html = await carregarHtmlMenu();
      setHTMLById('menu', html);
    } catch (error) {
      renderizarFallbackMenu(menuDiv);
      const mensagem = tratarErro(error, 'Nao foi possivel carregar o menu');
      mostrarNotificacao(mensagem, 'erro');
      throw error;
    }
  }

  // Destaca o item ativo conforme a página atual.
  const paginaAtual = getPaginaAtual('inicio.html');
  const links = menuDiv.querySelectorAll('.sidebar a[href]');
  links.forEach((link) => {
    const href = link.getAttribute('href');
    if (!href || href === '#') return;

    if (href === paginaAtual) {
      addClass(link, 'active');
    }
  });

  // Registra acao de logout com confirmacao
  const btnLogout = menuDiv.querySelector('#btnLogout');
  if (btnLogout && !btnLogout.dataset.bound) {
    btnLogout.dataset.bound = '1';
    btnLogout.addEventListener('click', (e) => {
      e.preventDefault();

      abrirModalConfirmacao({
        titulo: 'Sair da conta',
        mensagem: 'Tem certeza que deseja sair da sua conta?',
        onConfirmar: () => {
          fecharModal();
          logout();
        },
      });
    });
  }
}
