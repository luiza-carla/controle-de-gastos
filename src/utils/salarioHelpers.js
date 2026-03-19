// Helpers compartilhados para lógica de salários

// Retorna o primeiro dia do mês para uma data de referência
function obterInicioMes(dataReferencia = new Date()) {
  return new Date(
    dataReferencia.getFullYear(),
    dataReferencia.getMonth(),
    1,
    0,
    0,
    0,
    0
  );
}

// Verifica se salário já foi processado no mês atual
function salarioJaProcessadoNoMes(salario, dataReferencia = new Date()) {
  if (!salario) {
    return false;
  }

  if (salario.status === 'pago') {
    return true;
  }

  if (!salario.dataUltimoProcessamento) {
    return false;
  }

  return (
    new Date(salario.dataUltimoProcessamento) >= obterInicioMes(dataReferencia)
  );
}

// Extrai ID de ObjectId (mongo) de diferentes formatos de referência
function extrairContaId(contaRef) {
  if (!contaRef) {
    return null;
  }

  if (typeof contaRef === 'string') {
    const matchObjectId = contaRef.match(/[a-fA-F0-9]{24}/);
    return matchObjectId ? matchObjectId[0] : null;
  }

  if (typeof contaRef === 'object' && contaRef._id) {
    return contaRef._id.toString();
  }

  if (typeof contaRef?.toString === 'function') {
    const valor = contaRef.toString();
    return /^[a-fA-F0-9]{24}$/.test(valor) ? valor : null;
  }

  return null;
}

// Extrai destino de saldo para cálculo de deltas
function extrairDestinoSaldo(salario) {
  const fonteSaldo = salario?.fonteSaldo || 'conta';
  const contaId = extrairContaId(salario?.conta);

  if (fonteSaldo === 'carteira') {
    return { tipo: 'carteira' };
  }

  if (contaId) {
    return { tipo: 'conta', contaId };
  }

  return { tipo: 'nenhum' };
}

module.exports = {
  obterInicioMes,
  salarioJaProcessadoNoMes,
  extrairContaId,
  extrairDestinoSaldo,
};
