// Cache simples para reduzir chamadas desnecessárias à API.

export function createCarteiraState() {
  let cache = null;

  return {
    get() {
      return cache;
    },

    set(value) {
      cache = value;
    },

    invalidate() {
      cache = null;
    },

    has() {
      return cache !== null;
    },
  };
}
