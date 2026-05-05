const Conta = require('../../models/Conta');
const HistoricoService = require('../HistoricoService');
const { criarErro } = require('../../utils/errorHelpers');
const { obterOuCriar } = require('./carteiraRepository');
const {
  validarTransferencia,
  executarTransferencia,
} = require('./transferenciaHelpers');

class CarteiraService {
  async adicionarSaldo(usuarioId, valor) {
    if (!valor || valor === 0) throw criarErro(400, 'Valor inválido');

    const carteira = await obterOuCriar(usuarioId);
    const novoSaldo = carteira.saldo + valor;
    if (novoSaldo < 0) throw criarErro(400, 'Saldo insuficiente na carteira');

    carteira.saldo = novoSaldo;
    await carteira.save();
    return carteira;
  }

  async transferir(usuarioId, contaId, valor, direcao) {
    if (!contaId || !valor || valor <= 0)
      throw criarErro(400, 'Conta e valor são obrigatórios');
    if (!['carteira-para-conta', 'conta-para-carteira'].includes(direcao))
      throw criarErro(400, 'Direção inválida');

    const carteira = await obterOuCriar(usuarioId);
    const conta = await Conta.findOne({ _id: contaId, usuario: usuarioId });

    validarTransferencia(conta, carteira, valor, direcao);

    const saldoCarteiraAnterior = carteira.saldo;
    const saldoContaAnterior = conta.saldo;

    await executarTransferencia(carteira, conta, valor, direcao, usuarioId);

    const contaAtualizada = await Conta.findById(conta._id);

    await HistoricoService.registrar({
      usuario: usuarioId,
      entidade: 'carteira',
      entidadeId: carteira._id,
      acao: 'transferencia',
      descricao: HistoricoService.formatarDescricaoTransferenciaCarteira(
        conta,
        valor,
        direcao
      ),
      dadosAnteriores: {
        carteiraSaldo: saldoCarteiraAnterior,
        contaId: conta._id,
        contaSaldo: saldoContaAnterior,
        direcao,
      },
      dadosNovos: {
        carteiraSaldo: carteira.saldo,
        contaId: conta._id,
        contaSaldo: contaAtualizada.saldo,
        direcao,
      },
    });

    return {
      carteira,
      conta: contaAtualizada,
      mensagem: 'Transferência realizada com sucesso',
    };
  }

  async obterOuCriar(usuarioId) {
    return obterOuCriar(usuarioId);
  }
}

module.exports = new CarteiraService();
