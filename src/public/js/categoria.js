import { apiFetch, getToken } from './config.js';
import {
  $,
  onEventById,
  setupCategoriaAutocomplete,
  carregarSubcategorias,
  setupSubcategoriaAutocomplete,
} from './helpers/index.js';

// URL base da API de categorias
const categoriaBaseUrl = window.location.origin + '/categorias';

// Armazena todas as categorias para filtro
let todasCategorias = [];
let categoriaAutocomplete = null;
let subcategoriaAutocomplete = null;

export function limparCategoriaSelecionada() {
  categoriaAutocomplete?.limpar?.();
  subcategoriaAutocomplete?.limpar?.();
}

export function limparSubcategoriaSelecionada() {
  subcategoriaAutocomplete?.limpar?.();
}

// Lista todas as categorias e popula select
export async function listarCategorias() {
  const token = getToken();
  if (!token) throw new Error('Token não encontrado');

  // Busca categorias da API
  const categorias = await apiFetch(categoriaBaseUrl);
  todasCategorias = categorias;

  return categorias;
}

// Filtra categorias com base no texto de busca
export function filtrarCategorias(textoBusca) {
  categoriaAutocomplete?.filtrar?.(textoBusca || '');
}

// Inicializa categorias ao carregar a página
export async function inicializarCategorias() {
  await listarCategorias();

  const mostrarGrupo = (mostrar) => {
    const grp = $('subcategoriaGroup');
    if (grp) grp.style.display = mostrar ? '' : 'none';
  };

  categoriaAutocomplete = setupCategoriaAutocomplete(
    'buscaCategoria',
    'categoria',
    'dropdownCategorias',
    todasCategorias,
    async (id) => {
      // quando categoria é escolhida, carregamos subcategorias e
      // atualizamos o outro autocomplete
      const subs = await carregarSubcategorias(id);
      if (!subcategoriaAutocomplete) {
        subcategoriaAutocomplete = setupSubcategoriaAutocomplete(
          'buscaSubcategoria',
          'subcategoria',
          'dropdownSubcategorias',
          subs
        );
      } else {
        subcategoriaAutocomplete.atualizarOpcoes(subs);
      }
      // mostra o campo apenas se houver opções
      mostrarGrupo(subs && subs.length > 0);
    }
  );

  // inicializa campo de subcategoria vazio (opcional)
  subcategoriaAutocomplete = setupSubcategoriaAutocomplete(
    'buscaSubcategoria',
    'subcategoria',
    'dropdownSubcategorias',
    []
  );

  // esconder por padrão
  mostrarGrupo(false);

  // Garante limpeza visual da categoria quando formulario for resetado.
  const form = $('formTransacao');
  form?.addEventListener('reset', () => {
    limparCategoriaSelecionada();
    limparSubcategoriaSelecionada();
    mostrarGrupo(false);
  });

  const formDesejo = $('formListaDesejo');
  formDesejo?.addEventListener('reset', () => {
    limparCategoriaSelecionada();
    limparSubcategoriaSelecionada();
    mostrarGrupo(false);
  });

  // Mantem compatibilidade com quem chamar filtrarCategorias manualmente.
  onEventById('buscaCategoria', 'focus', () => {
    filtrarCategorias($('buscaCategoria')?.value || '');
  });

  // esconder grupo se o usuário apagar o texto da categoria
  const inputBusca = $('buscaCategoria');
  inputBusca?.addEventListener('input', () => {
    if (!inputBusca.value.trim()) {
      mostrarGrupo(false);
      // também limpa subcategoria armazenada
      limparSubcategoriaSelecionada();
    }
  });
}
