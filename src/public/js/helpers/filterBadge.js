import { $, addClass, removeClass } from './dom.js';

export function createFilterBadge({ buttonId, getCount }) {
  const button = $(buttonId);
  if (!button) {
    return { update: () => {} };
  }

  const badge = button.querySelector('.filter-badge');
  if (!badge) {
    return { update: () => {} };
  }

  function update() {
    const count = Number(getCount?.() ?? 0) || 0;
    badge.textContent = count > 0 ? String(count) : '';

    if (count > 0) {
      addClass(badge, 'visible');
    } else {
      removeClass(badge, 'visible');
    }
  }

  return { update };
}
