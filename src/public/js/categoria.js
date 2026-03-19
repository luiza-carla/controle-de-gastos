import {
  inicializarCategorias as initCategorias,
  listarCategorias as obterCategorias,
  filtrarCategorias as filtrarCategoriasExternamente,
  limparCategoriaSelecionada as limparCategoria,
  limparSubcategoriaSelecionada as limparSubcategoria,
} from './categoria/index.js';

export {
  limparCategoria as limparCategoriaSelecionada,
  limparSubcategoria as limparSubcategoriaSelecionada,
  limparCategoria,
  limparSubcategoria,
  obterCategorias as listarCategorias,
  filtrarCategoriasExternamente as filtrarCategorias,
};

export async function inicializarCategorias() {
  await initCategorias();
}
