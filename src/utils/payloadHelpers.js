function selecionarCamposPermitidos(payload = {}, camposPermitidos = []) {
  return camposPermitidos.reduce((acc, campo) => {
    if (!Object.prototype.hasOwnProperty.call(payload, campo)) {
      return acc;
    }

    const valor = payload[campo];
    if (valor === undefined) {
      return acc;
    }

    acc[campo] = valor;
    return acc;
  }, {});
}

module.exports = {
  selecionarCamposPermitidos,
};