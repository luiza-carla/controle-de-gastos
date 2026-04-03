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

function normalizeColor(color) {
  return String(color || '')
    .trim()
    .toLowerCase();
}

function getThemeClassName(color) {
  const normalizedColor = normalizeColor(color).replace('#', '');
  return normalizedColor ? `cat-theme-${normalizedColor}` : 'cat-theme-default';
}

function uniqueColorsFromCategories(categories) {
  return [
    ...new Set(
      (categories || [])
        .map((category) => normalizeColor(category?.cor))
        .filter(Boolean)
    ),
  ].sort((colorA, colorB) => colorA.localeCompare(colorB));
}

function generateCss(colors) {
  const blocks = colors
    .map(
      (color) => `.${getThemeClassName(color)} {
  --categoria-cor: ${color};
  --cor-categoria: ${color};
  --categoria-dot: ${color};
  --input-accent-color: ${color};
}`
    )
    .join('\n\n');

  return `/* Arquivo gerado automaticamente por categoryThemeGenerator.js */
/* Cada classe abaixo expõe a cor de uma categoria via variáveis CSS. */
.cat-theme-default {
  --categoria-cor: var(--gray-700);
  --cor-categoria: var(--gray-700);
  --categoria-dot: var(--gray-700);
  --input-accent-color: var(--gray-700);
}

${blocks}
`;
}

function generateJs(colors) {
  const entries = colors
    .map((color) => `  '${color}': '${getThemeClassName(color)}',`)
    .join('\n');

  return `// Arquivo gerado automaticamente por categoryThemeGenerator.js.
// Mapeia a cor salva nos dados para a classe CSS correspondente.
const CATEGORY_THEME_CLASS_BY_COLOR = {
${entries}
};

const DEFAULT_CATEGORY_THEME_CLASS = 'cat-theme-default';
const CATEGORY_THEME_CLASSES = [
  DEFAULT_CATEGORY_THEME_CLASS,
  ...Object.values(CATEGORY_THEME_CLASS_BY_COLOR),
];

function normalizeCategoryColor(color) {
  return String(color || '')
    .trim()
    .toLowerCase();
}

function getCategoryThemeClassFromColor(color) {
  return (
    CATEGORY_THEME_CLASS_BY_COLOR[normalizeCategoryColor(color)] ||
    DEFAULT_CATEGORY_THEME_CLASS
  );
}

export {
  CATEGORY_THEME_CLASSES,
  DEFAULT_CATEGORY_THEME_CLASS,
  getCategoryThemeClassFromColor,
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

function generateCategoryThemeFiles(categories) {
  // Gera os artefatos consumidos pelo frontend a partir das cores existentes.
  const colors = uniqueColorsFromCategories(categories);
  writeFile(outputCssPath, generateCss(colors));
  writeFile(outputJsPath, generateJs(colors));
}

module.exports = {
  generateCategoryThemeFiles,
  uniqueColorsFromCategories,
};
