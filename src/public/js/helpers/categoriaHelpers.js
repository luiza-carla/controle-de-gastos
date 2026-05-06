import {
  removerAcentos,
  setHTMLById,
  addClass,
  removeClass,
  escaparHtml,
  $,
  showElement,
  hideElement,
  getCategoryThemeClass,
  applyCategoryTheme,
  clearCategoryTheme,
} from './index.js';

import * as logger from './logger.js';

// Configura autocomplete de categorias reutilizável para modais
export function setupCategoriaAutocomplete(
  inputId,
  inputHiddenId,
  dropdownId,
  categorias,
  onSelect
) {
  const inputBusca = $(inputId);
  const inputHidden = $(inputHiddenId);
  const dropdown = $(dropdownId);

  if (!inputBusca && !inputHidden && !dropdown) return;

  if (!inputBusca || !inputHidden || !dropdown) {
    logger.warn(
      `Categoria autocomplete não inicializado: ${inputId}`,
      'categoriaHelpers'
    );
    return;
  }

  let categoriaSelecionada = null;

  const aplicarTema = (slug = '') => {
    if (!slug) {
      clearCategoryTheme(inputBusca);
      return;
    }

    applyCategoryTheme(inputBusca, slug, {
      accent: true,
    });
  };

  const selecionarCategoria = (id, nome, slug) => {
    inputBusca.value = nome;
    inputHidden.value = id;

    categoriaSelecionada = { id, nome, slug };

    aplicarTema(slug);

    removeClass(dropdown, 'show');
    hideElement(dropdown);
  };

  const mostrarDropdown = (categoriasFiltradas) => {
    if (categoriasFiltradas.length === 0) {
      setHTMLById(
        dropdownId,
        '<div class="categoria-item">Nenhuma categoria encontrada</div>'
      );
      addClass(dropdown, 'show');
      showElement(dropdown);
      return;
    }

    const html = categoriasFiltradas
      .map(
        (cat) =>
          `<div class="categoria-item"
            data-id="${escaparHtml(String(cat._id ?? ''))}"
            data-nome="${escaparHtml(cat.nome)}"
            data-slug="${escaparHtml(String(cat.slug ?? ''))}">
            
            <span class="categoria-cor ${getCategoryThemeClass(cat.slug)}"></span>
            <span class="categoria-nome">${escaparHtml(cat.nome)}</span>
          </div>`
      )
      .join('');

    setHTMLById(dropdownId, html);

    dropdown.querySelectorAll('.categoria-item').forEach((item) => {
      item.addEventListener('click', () => {
        const id = item.getAttribute('data-id');
        const nome = item.getAttribute('data-nome');
        const slug = item.getAttribute('data-slug');

        if (id && nome) {
          selecionarCategoria(id, nome, slug);
          onSelect?.(id, nome, slug);
        }
      });
    });

    addClass(dropdown, 'show');
    showElement(dropdown);
  };

  const filtrar = (textoBusca) => {
    const termo = removerAcentos(textoBusca.toLowerCase().trim());

    const categoriasFiltradas = termo
      ? categorias.filter((cat) =>
          removerAcentos(cat.nome.toLowerCase()).includes(termo)
        )
      : categorias;

    mostrarDropdown(categoriasFiltradas);
  };

  // Focus mostra dropdown mesmo se já houver algo digitado/selecionado
  inputBusca.addEventListener('focus', () => filtrar(''));
  inputBusca.addEventListener('click', () => filtrar(''));

  inputBusca.addEventListener('input', (e) => {
    if (categoriaSelecionada && e.target.value !== categoriaSelecionada.nome) {
      inputHidden.value = '';
      categoriaSelecionada = null;
      aplicarTema('');
    }

    filtrar(e.target.value);
  });

  // Fecha ao clicar fora
  const handler = (e) => {
    const autocomplete =
      dropdown.closest('.categoria-autocomplete') || dropdown.parentElement;

    if (autocomplete && !autocomplete.contains(e.target)) {
      removeClass(dropdown, 'show');
      hideElement(dropdown);
    }
  };

  document.addEventListener('click', handler);

  // Se já existe valor no campo (restauração do navegador), tenta sincronizar
  if (inputHidden.value) {
    const cat = categorias.find((c) => c._id === inputHidden.value);

    if (cat) {
      selecionarCategoria(cat._id, cat.nome, cat.slug);
      onSelect?.(cat._id, cat.nome, cat.slug);
    }
  } else if (inputBusca.value) {
    const termo = removerAcentos(inputBusca.value.toLowerCase().trim());

    // Primeiro tenta encontrar correspondência exata (sem acentos)
    let cat = categorias.find(
      (c) => removerAcentos(c.nome.toLowerCase()).trim() === termo
    );

    // Se não encontrou, tenta buscar por substring (mais permissivo)
    if (!cat) {
      cat = categorias.find((c) =>
        removerAcentos(c.nome.toLowerCase()).includes(termo)
      );
    }

    if (cat) {
      selecionarCategoria(cat._id, cat.nome, cat.slug);
      onSelect?.(cat._id, cat.nome, cat.slug);
    }
  }

  return {
    selecionarCategoria,
    limpar: () => {
      inputBusca.value = '';
      inputHidden.value = '';
      categoriaSelecionada = null;
      aplicarTema('');
      removeClass(dropdown, 'show');
      hideElement(dropdown);
    },
    filtrar: (textoBusca = '') => filtrar(textoBusca),
  };
}
