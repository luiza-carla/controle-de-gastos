const FaturaService = require('../services/fatura');

class FaturaController {
  async listar(req, res) {
    const faturas = await FaturaService.listarFaturasDoUsuario(req.user.id);
    res.json(faturas);
  }
}

module.exports = new FaturaController();
