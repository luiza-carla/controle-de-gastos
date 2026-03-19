export function createContaState() {
  let contas = null;

  return {
    getContas() {
      return contas;
    },

    setContas(novasContas) {
      contas = Array.isArray(novasContas) ? novasContas : [];
    },

    invalidateContas() {
      contas = null;
    },

    hasContas() {
      return Array.isArray(contas) && contas.length > 0;
    },
  };
}
