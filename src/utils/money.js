function obterNumeroSeguro(valor, fallback = 0) {
  const numero = Number(valor);
  return Number.isFinite(numero) ? numero : fallback;
}

function paraCentavos(valor) {
  return Math.round(obterNumeroSeguro(valor) * 100);
}

function deCentavos(valorEmCentavos) {
  const inteiro = Number.isFinite(Number(valorEmCentavos))
    ? Math.round(Number(valorEmCentavos))
    : 0;
  return Number((inteiro / 100).toFixed(2));
}

function normalizarDinheiro(valor) {
  return deCentavos(paraCentavos(valor));
}

function somarDinheiro(...valores) {
  const totalEmCentavos = valores.reduce(
    (acc, valor) => acc + paraCentavos(valor),
    0
  );
  return deCentavos(totalEmCentavos);
}

function subtrairDinheiro(valorInicial, ...valores) {
  const totalSubtraidoEmCentavos = valores.reduce(
    (acc, valor) => acc + paraCentavos(valor),
    0
  );
  return deCentavos(paraCentavos(valorInicial) - totalSubtraidoEmCentavos);
}

function somarCampoDinheiro(lista = [], campoOuFn = 'valor') {
  const obterValor =
    typeof campoOuFn === 'function' ? campoOuFn : (item) => item?.[campoOuFn];

  const totalEmCentavos = lista.reduce(
    (acc, item) => acc + paraCentavos(obterValor(item)),
    0
  );

  return deCentavos(totalEmCentavos);
}

module.exports = {
  obterNumeroSeguro,
  paraCentavos,
  deCentavos,
  normalizarDinheiro,
  somarDinheiro,
  subtrairDinheiro,
  somarCampoDinheiro,
};
