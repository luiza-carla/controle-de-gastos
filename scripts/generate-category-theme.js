const defaultCategories = require('../src/config/defaultCategories');
const {
  generateCategoryThemeFiles,
} = require('../src/utils/categoryThemeGenerator');

// Usa o catálogo padrão para gerar os arquivos estáticos do frontend.
generateCategoryThemeFiles(defaultCategories);
