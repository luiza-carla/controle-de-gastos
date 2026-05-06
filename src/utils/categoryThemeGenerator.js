const fs = require('fs');
const path = require('path');

const outputCssPath = path.join(
  __dirname,
  '..',
  'public',
  'css',
  'generated-category-themes.css'
);
const outputJsPath = path.join(
  __dirname,
  '..',
  'public',
  'js',
  'helpers',
  'generatedCategoryTheme.js'
);

function normalizeSlug(slug) {
  return String(slug || '')
    .trim()
    .toLowerCase();
}

function getThemeClassName(slug) {
  return slug ? `cat-theme-${normalizeSlug(slug)}` : 'cat-theme-default';
}

function formatObjectKey(key) {
  const normalizedKey = normalizeSlug(key);
  return /^[$A-Z_][0-9A-Z_$]*$/i.test(normalizedKey)
    ? normalizedKey
    : `'${normalizedKey}'`;
}

function uniqueSlugsFromCategories(categories) {
  return [
    ...new Set(
      (categories || [])
        .map((category) => normalizeSlug(category?.slug))
        .filter(Boolean)
    ),
  ].sort((a, b) => a.localeCompare(b));
}

function generateCss(categories) {
  const blocks = categories
    .map(
      (cat) => `.${getThemeClassName(cat.slug)} {
  --categoria-cor: ${cat.cor};
  --cor-categoria: ${cat.cor};
  --categoria-dot: ${cat.cor};
  --input-accent-color: ${cat.cor};
}`
    )
    .join('\n\n');
  return `/* Arquivo gerado automaticamente por categoryThemeGenerator.js */
.cat-theme-default {
  --categoria-cor: var(--gray-700);
  --cor-categoria: var(--gray-700);
  --categoria-dot: var(--gray-700);
  --input-accent-color: var(--gray-700);
}

${blocks}
`;
}

function generateJs(categories) {
  const entries = categories
    .map(
      (cat) =>
        `  ${formatObjectKey(cat.slug)}: '${getThemeClassName(cat.slug)}',`
    )
    .join('\n');

  return `// Arquivo gerado automaticamente por categoryThemeGenerator.js.
// Mapeia o slug da categoria para a classe CSS correspondente.
const CATEGORY_THEME_CLASS_BY_SLUG = {
${entries}
};

const DEFAULT_CATEGORY_THEME_CLASS = 'cat-theme-default';

const CATEGORY_THEME_CLASSES = [
  DEFAULT_CATEGORY_THEME_CLASS,
  ...Object.values(CATEGORY_THEME_CLASS_BY_SLUG),
];

function normalizeCategorySlug(slug) {
  return String(slug || '')
    .trim()
    .toLowerCase();
}

function getCategoryThemeClassFromSlug(slug) {
  return (
    CATEGORY_THEME_CLASS_BY_SLUG[normalizeCategorySlug(slug)] ||
    DEFAULT_CATEGORY_THEME_CLASS
  );
}

export {
  CATEGORY_THEME_CLASSES,
  DEFAULT_CATEGORY_THEME_CLASS,
  getCategoryThemeClassFromSlug,
};
`;
}

function writeFile(filePath, content) {
  const currentContent = fs.existsSync(filePath)
    ? fs.readFileSync(filePath, 'utf8')
    : null;

  if (currentContent === content) {
    return;
  }

  fs.writeFileSync(filePath, content, 'utf8');
}

// FIX: deduplicação por slug usando Map antes de gerar CSS e JS.
// Garante que mesmo que o Mongo retorne categorias com slugs repetidos
// (edge case ou dados sujos), o arquivo gerado nunca terá blocos/entradas duplicadas.
// A primeira ocorrência de cada slug prevalece; slugs são normalizados e ordenados.
function generateCategoryThemeFiles(categories) {
  const slugMap = new Map();

  for (const cat of categories || []) {
    if (!cat?.slug) continue;
    const slug = normalizeSlug(cat.slug);
    // Primeira ocorrência vence, evita sobrescrever com dados parciais
    if (!slugMap.has(slug)) {
      slugMap.set(slug, { slug, cor: cat.cor });
    }
  }
  const normalizedCategories = [...slugMap.values()].sort((a, b) =>
    a.slug.localeCompare(b.slug)
  );

  writeFile(outputCssPath, generateCss(normalizedCategories));
  writeFile(outputJsPath, generateJs(normalizedCategories));
}

module.exports = {
  generateCategoryThemeFiles,
  formatObjectKey,
  uniqueSlugsFromCategories,
};
