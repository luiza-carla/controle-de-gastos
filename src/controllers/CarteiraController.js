const CarteiraService = require('../services/carteira');

class CarteiraController {
  // Obtém ou cria carteira do usuário
  async obter(req, res) {
    const carteira = await CarteiraService.obterOuCriar(req.user.id);
    res.json(carteira);
  }

  // Atualiza saldo da carteira (entrada)
  async atualizarSaldo(req, res) {
    const { valor } = req.body;
    const carteira = await CarteiraService.adicionarSaldo(req.user.id, valor);
    res.json(carteira);
  }

  // Transfere dinheiro entre carteira e conta
  async transferir(req, res) {
    const { contaId, valor, direcao } = req.body;
    const resultado = await CarteiraService.transferir(
      req.user.id,
      contaId,
      valor,
      direcao
    );
    res.json(resultado);
  }
}

module.exports = new CarteiraController();
