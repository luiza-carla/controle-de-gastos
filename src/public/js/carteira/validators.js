import { parseCurrency } from '../helpers/index.js';

export function validarValorParaOperacao(valorString) {
  const valor = parseCurrency(valorString);
  if (!valor || valor <= 0) {
    return { valido: false, mensagem: 'Valor inválido' };
  }

  return { valido: true, valor };
}

export function validarSaldoDisponivel(valor, saldo) {
  if (valor > saldo) {
    return { valido: false, mensagem: 'Saldo insuficiente na carteira' };
  }

  return { valido: true, valor };
}
