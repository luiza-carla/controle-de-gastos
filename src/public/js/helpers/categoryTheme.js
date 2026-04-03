import {
  CATEGORY_THEME_CLASSES,
  getCategoryThemeClassFromColor,
} from './generatedCategoryTheme.js';

function getCategoryThemeClass(color) {
  return getCategoryThemeClassFromColor(color);
}

function clearCategoryTheme(element) {
  if (!element) return;
  element.classList.remove(...CATEGORY_THEME_CLASSES, 'input-categoria-accent');
}

function applyCategoryTheme(
  element,
  color,
  { accent = false } = {}
) {
  if (!element) return;
  clearCategoryTheme(element);
  element.classList.add(getCategoryThemeClass(color));
  if (accent) {
    element.classList.add('input-categoria-accent');
  }
}

export {
  getCategoryThemeClass,
  applyCategoryTheme,
  clearCategoryTheme,
};