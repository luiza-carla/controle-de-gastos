import {
  CATEGORY_THEME_CLASSES,
  getCategoryThemeClassFromSlug,
} from './generatedCategoryTheme.js';

function getCategoryThemeClass(slug) {
  return getCategoryThemeClassFromSlug(slug);
}

function clearCategoryTheme(element) {
  if (!element) return;
  element.classList.remove(...CATEGORY_THEME_CLASSES, 'input-categoria-accent');
}

function applyCategoryTheme(element, slug, { accent = false } = {}) {
  if (!element) return;
  clearCategoryTheme(element);

  const themeClass = getCategoryThemeClass(slug);
  element.classList.add(themeClass);

  if (accent) {
    element.classList.add('input-categoria-accent');
  }
}

export { getCategoryThemeClass, applyCategoryTheme, clearCategoryTheme };
