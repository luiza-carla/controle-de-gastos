import {
  removerAcentos,
  setHTMLById,
  addClass,
  removeClass,
  escaparHtml,
  $,
  showElement,
  hideElement,
} from './index.js';
import * as logger from './logger.js';
import { apiFetch } from '../config.js';

// carrega a lista de subcategorias de uma categoria via API
export async function carregarSubcategorias(categoriaId) {
  if (!categoriaId) return [];
  try {
    // utiliza apiFetch para incluir token de autenticação
    const subs = await apiFetch(
      `${window.location.origin}/categorias/${categoriaId}/subcategorias`
    );
    return subs || [];
  } catch (e) {
    logger.warn('falha ao buscar subcategorias', 'subcategoriaHelpers', e);
    return [];
  }
}

// semelhança com o autocomplete de categoria, mas recebe um array
// dinâmico que pode ser atualizado pelo chamador.
export function setupSubcategoriaAutocomplete(
  inputId,
  inputHiddenId,
  dropdownId,
  initialList = []
) {
  const inputBusca = $(inputId);
  const inputHidden = $(inputHiddenId);
  const dropdown = $(dropdownId);

  if (!inputBusca && !inputHidden && !dropdown) return;
  if (!inputBusca || !inputHidden || !dropdown) {
    logger.warn(
      `Subcategoria autocomplete não inicializado: ${inputId}`,
      'subcategoriaHelpers'
    );
    return;
  }

  let subcategorias = initialList;
  let selecionada = null;

  const mostrarDropdown = (lista) => {
    if (lista.length === 0) {
      setHTMLById(
        dropdownId,
        '<div class="categoria-item">Nenhuma subcategoria disponível</div>'
      );
      addClass(dropdown, 'show');
      showElement(dropdown);
      return;
    }

    const html = lista
      .map(
        (sub) =>
          `<div class="categoria-item" data-id="${sub._id}" data-nome="${escaparHtml(sub.nome)}">
        <span class="categoria-nome">${escaparHtml(sub.nome)}</span>
      </div>`
      )
      .join('');

    setHTMLById(dropdownId, html);
    dropdown.querySelectorAll('.categoria-item').forEach((item) => {
      item.addEventListener('click', () => {
        const id = item.getAttribute('data-id');
        const nome = item.getAttribute('data-nome');
        if (id && nome) {
          inputBusca.value = nome;
          inputHidden.value = id;
          selecionada = { id, nome };
          removeClass(dropdown, 'show');
          hideElement(dropdown);
        }
      });
    });

    addClass(dropdown, 'show');
    showElement(dropdown);
  };

  const filtrar = (texto) => {
    const termo = removerAcentos(texto.toLowerCase().trim());
    const filtradas = termo
      ? subcategorias.filter((s) =>
          removerAcentos(s.nome.toLowerCase()).includes(termo)
        )
      : subcategorias;
    mostrarDropdown(filtradas);
  };

  inputBusca.addEventListener('focus', () => filtrar(''));
  inputBusca.addEventListener('click', () => filtrar(''));
  inputBusca.addEventListener('input', (e) => {
    if (selecionada && e.target.value !== selecionada.nome) {
      inputHidden.value = '';
      selecionada = null;
    }
    filtrar(e.target.value);
  });

  const handler = (e) => {
    const autocomplete =
      dropdown.closest('.categoria-autocomplete') || dropdown.parentElement;
    if (autocomplete && !autocomplete.contains(e.target)) {
      removeClass(dropdown, 'show');
      hideElement(dropdown);
    }
  };
  document.addEventListener('click', handler);

  return {
    selecionar: (id, nome) => {
      inputBusca.value = nome;
      inputHidden.value = id;
      selecionada = { id, nome };
      removeClass(dropdown, 'show');
      hideElement(dropdown);
    },
    limpar: () => {
      inputBusca.value = '';
      inputHidden.value = '';
      selecionada = null;
      removeClass(dropdown, 'show');
      hideElement(dropdown);
    },
    atualizarOpcoes: (novaLista) => {
      subcategorias = novaLista || [];
      filtrar('');
    },
  };
}

/**
 * Retorna o valor de subcategoria a ser enviado para o backend.
 * Se o campo de busca estiver vazio, o backend deverá removê-la.
 */
export function obterSubcategoriaParaEnviar(buscaInputId, hiddenInputId) {
  const busca = $(buscaInputId);
  const oculto = $(hiddenInputId);
  const buscaValor = busca?.value?.trim();
  return buscaValor ? oculto?.value || '' : '';
}

/**
 * Vincula a alteração de categoria à limpeza automática de subcategoria.
 * Útil para evitar que uma subcategoria de outra categoria fique selecionada.
 */
export function conectarCategoriaLimpaSubcategoria(
  categoriaInputId,
  subcategoriaAutocomplete
) {
  const categoriaInput = $(categoriaInputId);
  if (!categoriaInput || !subcategoriaAutocomplete) return;

  categoriaInput.addEventListener('input', () => {
    subcategoriaAutocomplete.limpar?.();
  });
}
