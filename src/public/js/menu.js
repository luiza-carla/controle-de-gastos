import { logout } from './logout.js';
import { abrirModalConfirmacao, fecharModal } from './modalDeletar.js';
import { $, addClass, getPaginaAtual, setHTMLById } from './helpers/index.js';
import * as logger from './helpers/logger.js';

const MENU_CACHE_KEY = 'menuHtmlCacheV1';
const MENU_MAX_TENTATIVAS = 2;

function lerMenuDoCache() {
  try {
    return sessionStorage.getItem(MENU_CACHE_KEY);
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
