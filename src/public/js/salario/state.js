let salariosCache = null;

export function getSalariosCache() {
  return salariosCache;
}

export function setSalariosCache(salarios) {
  salariosCache = salarios;
}

export function invalidateSalariosCache() {
  salariosCache = null;
}
