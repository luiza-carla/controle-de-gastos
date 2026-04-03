const ContaService = require('../services/ContaService');

class ContaController {
  // Cria nova conta
  async criar(req, res) {
    const dados = { ...req.body, usuario: req.user.id };
    const conta = await ContaService.criar(dados);
    res.status(201).json(conta);
  }

  // Lista todas as contas do usuário
  async listar(req, res) {
    const contas = await ContaService.listar(req.user.id);
    res.json(contas);
  }

  // Atualiza conta existente
  async atualizar(req, res) {
    const conta = await ContaService.atualizar(
      req.params.id,
      req.user.id,
      req.body
    );
    res.json(conta);
  }

  // Deleta uma conta
  async deletar(req, res) {
    await ContaService.deletar(req.params.id, req.user.id);
    res.json({ mensagem: 'Conta deletada' });
  }

  // Transfere entre contas do usuário
  async transferir(req, res) {
    const { contaDestinoId, valor } = req.body;
    const resultado = await ContaService.transferir(
      req.params.id,
      contaDestinoId,
      valor,
      req.user.id
    );
    res.json(resultado);
  }
}

module.exports = new ContaController();
