import {
  escaparHtml,
  setDisabledById,
  $,
  clearElement,
  getCategoryThemeClass,
} from './index.js';

// Cria badge visual de categoria com cor personalizada
// Se uma subcategoria for fornecida, também gera um badge para ela usando
// a mesma cor da categoria pai. Assim o front exibe os dois como badges
// alinhados e coloridos igualmente.
export function criarBadgeCategoria(categoria, subcategoria) {
  const nome = categoria?.nome || 'Sem categoria';
  const themeClass = getCategoryThemeClass(categoria?.slug);

  let html = `<span class="categoria-badge ${themeClass}">${escaparHtml(nome)}</span>`;

  if (subcategoria && subcategoria.nome) {
    // badge secundário para subcategoria; mantém a mesma cor e dá um
    // pequeno espaçamento à esquerda para separar dos badges de categoria
    html += ` <span class="categoria-badge subcategoria-badge ${themeClass}">${escaparHtml(subcategoria.nome)}</span>`;
  }

  return html;
}

// Retorna badges separados para categoria e subcategoria.
export function criarBadgesCategoriaSubcategoriaSeparados(
  categoria,
  subcategoria
) {
  const categoriaBadge = criarBadgeCategoria(categoria);

  const subcategoriaBadge =
    subcategoria && subcategoria.nome
      ? `<span class="categoria-badge subcategoria-badge ${getCategoryThemeClass(categoria?.slug)}">${escaparHtml(
          subcategoria.nome
        )}</span>`
      : '';

  return { categoriaBadge, subcategoriaBadge };
}

// Atualiza a visualização das tags selecionadas no formulário
export function atualizarTagsVisual(container, tags) {
  clearElement(container);

  tags.forEach((tag, index) => {
    // Cria elemento visual para cada tag
    const tagEl = document.createElement('span');
    tagEl.textContent = tag + ' ✕';
    tagEl.className = 'tag-chip-edit';

    // Permite remover tag ao clicar no X
    tagEl.onclick = () => {
      tags.splice(index, 1);
      atualizarTagsVisual(container, tags);
      setDisabledById('btnNovaTag', false);
      setDisabledById('tagInput', false);
    };

    container.appendChild(tagEl);
  });
}

// Inicializa sistema de tags no formulário (máximo 3 tags)
export function inicializarTags(tags) {
  const input = $('tagInput');
  const btnAdd = $('btnAddTag');
  const btnNova = $('btnNovaTag');
  const container = $('tagsContainer');

  if (!input || !btnAdd || !btnNova || !container) return;

  // Adiciona tag à lista quando usuário confirma
  function adicionarTag() {
    const valor = input.value.trim();
    if (!valor) return;

    // Valida limite de 3 tags
    if (tags.length >= 3) {
      alert('Máximo de 3 tags');
      return;
    }

    tags.push(valor);
    atualizarTagsVisual(container, tags);
    input.value = '';

    // Desabilita input ao atingir limite
    if (tags.length >= 3) {
      setDisabledById('btnNovaTag', true);
      setDisabledById('tagInput', true);
    }
  }

  // Adiciona tag ao clicar no botão
  btnAdd.addEventListener('click', adicionarTag);

  // Reabilita input ao clicar no botão nova tag
  btnNova.addEventListener('click', () => {
    input.disabled = false;
    input.focus();
  });

  // Adiciona tag ao pressionar Enter
  input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      adicionarTag();
    }
  });
}

// Gera HTML das tags para exibição
export function gerarTags(tagsArray) {
  if (!tagsArray?.length) return '';

  return tagsArray
    .map((tag) => `<span class="tag">${escaparHtml(tag)}</span>`)
    .join('');
}

// Inicializa editor de tags reutilizavel para modais
export function inicializarEditorTags({
  tags,
  containerId,
  inputId,
  addButtonId,
  maxTags = 3,
}) {
  const container = $(containerId);
  const input = $(inputId);
  const btnAdd = $(addButtonId);

  if (!container || !input || !btnAdd) return;

  const render = () => {
    clearElement(container);

    tags.forEach((tag, index) => {
      const tagEl = document.createElement('span');
      tagEl.textContent = tag + ' ✕';
      tagEl.className = 'tag-chip-edit';

      tagEl.onclick = () => {
        tags.splice(index, 1);
        render();
      };

      container.appendChild(tagEl);
    });
  };

  const adicionarTag = () => {
    const valor = input.value.trim();
    if (!valor) return;

    if (tags.length >= maxTags) {
      alert('Máximo de 3 tags');
      return;
    }

    if (tags.includes(valor)) return;

    tags.push(valor);
    input.value = '';
    render();
  };

  btnAdd.addEventListener('click', adicionarTag);
  input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      adicionarTag();
    }
  });

  render();
}

// Reseta estado de tags no formulario principal
export function resetarTagsFormulario(tags, options = {}) {
  const {
    containerId = 'tagsContainer',
    inputId = 'tagInput',
    btnNovaId = 'btnNovaTag',
  } = options;

  tags.length = 0;
  atualizarTagsVisual($(containerId), tags);
  setDisabledById(btnNovaId, false);
  setDisabledById(inputId, false);
}
