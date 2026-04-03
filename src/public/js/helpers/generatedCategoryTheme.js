// Arquivo gerado automaticamente por categoryThemeGenerator.js.
// Mapeia a cor salva nos dados para a classe CSS correspondente.
const CATEGORY_THEME_CLASS_BY_COLOR = {
  '#00bcd4': 'cat-theme-00bcd4',
  '#00cec9': 'cat-theme-00cec9',
  '#16a085': 'cat-theme-16a085',
  '#1abc9c': 'cat-theme-1abc9c',
  '#1f618d': 'cat-theme-1f618d',
  '#27ae60': 'cat-theme-27ae60',
  '#2980b9': 'cat-theme-2980b9',
  '#2e86c1': 'cat-theme-2e86c1',
  '#2ecc71': 'cat-theme-2ecc71',
  '#34495e': 'cat-theme-34495e',
  '#3498db': 'cat-theme-3498db',
  '#4a235a': 'cat-theme-4a235a',
  '#52be80': 'cat-theme-52be80',
  '#58d68d': 'cat-theme-58d68d',
  '#5b2c6f': 'cat-theme-5b2c6f',
  '#5dade2': 'cat-theme-5dade2',
  '#6c3483': 'cat-theme-6c3483',
  '#7b241c': 'cat-theme-7b241c',
  '#7f8c8d': 'cat-theme-7f8c8d',
  '#884ea0': 'cat-theme-884ea0',
  '#8e44ad': 'cat-theme-8e44ad',
  '#9b59b6': 'cat-theme-9b59b6',
  '#a569bd': 'cat-theme-a569bd',
  '#af7ac5': 'cat-theme-af7ac5',
  '#bb8fce': 'cat-theme-bb8fce',
  '#c0392b': 'cat-theme-c0392b',
  '#cd6155': 'cat-theme-cd6155',
  '#d2b4de': 'cat-theme-d2b4de',
  '#d35400': 'cat-theme-d35400',
  '#d68910': 'cat-theme-d68910',
  '#d98880': 'cat-theme-d98880',
  '#e67e22': 'cat-theme-e67e22',
  '#e74c3c': 'cat-theme-e74c3c',
  '#e84393': 'cat-theme-e84393',
  '#eb984e': 'cat-theme-eb984e',
  '#ec7063': 'cat-theme-ec7063',
  '#f06292': 'cat-theme-f06292',
  '#f1948a': 'cat-theme-f1948a',
  '#f39c12': 'cat-theme-f39c12',
  '#f5b041': 'cat-theme-f5b041',
  '#f8c471': 'cat-theme-f8c471',
  '#ff4fa3': 'cat-theme-ff4fa3',
  '#ff7a18': 'cat-theme-ff7a18',
  '#ff9800': 'cat-theme-ff9800',
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
