const defaultCategories = require('../src/config/defaultCategories');
const {
  generateCategoryThemeFiles,
} = require('../src/utils/categoryThemeGenerator');

function buildSlug(str) {
  return String(str || '')
    .trim()
    .toLowerCase()
    .normalize('NFD') // decompõe acentos
    .replace(/[\u0300-\u036f]/g, '') // remove diacríticos
    .replace(/\s+/g, '-') // espaços > hífen
    .replace(/[^\w-]/g, ''); // remove caracteres inválidos
}

// Garante que todas as categorias têm slug e cor antes de gerar o tema
const normalizedCategories = defaultCategories
  .filter((cat) => cat?.cor) // descarta categorias sem cor, gerariam CSS inválido
  .map((cat) => ({
    ...cat,
    slug: buildSlug(cat.slug || cat.nome),
  }));

generateCategoryThemeFiles(normalizedCategories);
