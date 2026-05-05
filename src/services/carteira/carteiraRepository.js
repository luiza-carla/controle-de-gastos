const Carteira = require('../../models/Carteira');

// Obtém ou cria carteira do usuário
async function obterOuCriar(usuarioId) {
  let carteira = await Carteira.findOne({ usuario: usuarioId });

  if (!carteira) {
    carteira = await Carteira.create({
      usuario: usuarioId,
      saldo: 0,
    });
  }

  return carteira;
}

module.exports = { obterOuCriar };
