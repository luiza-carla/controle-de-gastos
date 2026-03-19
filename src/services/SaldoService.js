const Conta = require('../models/Conta');
const Carteira = require('../models/Carteira');
const { extrairContaId } = require('../utils/salarioHelpers');

// Serviço utilitário para aplicar ou reverter alterações de saldo em
// contas/carteira. O objetivo é centralizar a lógica que estava
// espalhada em diversos controllers e no agendador de salários.
class SaldoService {
  /**
   * Aplica deltas em múltiplas contas.
   * @param {Record<string, number>} deltas - mapa contaId -> valor a somar
   * @param {string} usuarioId
   */
  static async aplicarDeltaContas(deltas, usuarioId) {
    const entradas = Object.entries(deltas).filter(([, v]) => v !== 0);
    for (const [contaId, delta] of entradas) {
      const contaIdNormalizada = extrairContaId(contaId);
      if (!contaIdNormalizada) {
        continue;
      }
      await Conta.updateOne(
        { _id: contaIdNormalizada, usuario: usuarioId },
        { $inc: { saldo: Number(delta) } }
      );
    }
  }

  /**
   * Aplica delta na carteira.
   */
  static async aplicarDeltaCarteira(delta, usuarioId) {
    if (!delta) {
      return;
    }

    await Carteira.updateOne(
      { usuario: usuarioId },
      { $inc: { saldo: Number(delta) } },
      { upsert: true }
    );
  }

  /**
   * Ajusta saldo conforme os dados de uma transação.
   */
  static async aplicarMovimento(transacao, usuarioId) {
    const valor = Number(transacao.valor || 0);
    const multiplicador = transacao.tipo === 'entrada' ? 1 : -1;
    const delta = multiplicador * valor;

    if (transacao.fonteSaldo === 'carteira') {
      await Carteira.updateOne(
        { usuario: usuarioId },
        { $inc: { saldo: delta } },
        { upsert: true }
      );
      return;
    }

    const contaId = extrairContaId(transacao.conta);
    if (!contaId) {
      return;
    }

    await Conta.updateOne(
      { _id: contaId, usuario: usuarioId },
      { $inc: { saldo: delta } }
    );
  }

  /**
   * Reverte a aplicação de um movimento de transação.
   */
  static async reverterMovimento(transacao, usuarioId) {
    const valor = Number(transacao.valor || 0);
    const multiplicador = transacao.tipo === 'entrada' ? -1 : 1;
    const delta = multiplicador * valor;

    if (transacao.fonteSaldo === 'carteira') {
      await Carteira.updateOne(
        { usuario: usuarioId },
        { $inc: { saldo: delta } },
        { upsert: true }
      );
      return;
    }

    const contaId = extrairContaId(transacao.conta);
    if (!contaId) {
      return;
    }

    await Conta.updateOne(
      { _id: contaId, usuario: usuarioId },
      { $inc: { saldo: delta } }
    );
  }

  /**
   * Calcula quanto da transação afetaria a carteira (positivos para entradas
   * pagas, negativos para saídas pagas).
   */
  static obterDeltaAplicadoCarteira(transacao) {
    if (!transacao || transacao.fonteSaldo !== 'carteira') {
      return 0;
    }

    if (transacao.status !== 'pago') {
      return 0;
    }

    const valor = Number(transacao.valor || 0);
    if (!valor) {
      return 0;
    }

    return transacao.tipo === 'entrada' ? valor : -valor;
  }

  /**
   * Verifica se há saldo disponível para a operação indicada (carteira ou conta).
   * Lança erro 400/404 em caso de insuficiência ou recurso inexistente.
   */
  static async validarSaldoDisponivel({
    usuarioId,
    contaId,
    fonteSaldo,
    valor,
  }) {
    if (fonteSaldo === 'carteira') {
      const carteira = await Carteira.findOne({ usuario: usuarioId });
      const saldo = Number(carteira?.saldo || 0);
      if (valor > saldo) {
        const err = new Error('Saldo insuficiente na carteira');
        err.statusCode = 400;
        throw err;
      }
      return;
    }

    if (!contaId) {
      const err = new Error('Conta é obrigatória para transações em conta');
      err.statusCode = 400;
      throw err;
    }

    const conta = await Conta.findOne({ _id: contaId, usuario: usuarioId });
    if (!conta) {
      const err = new Error('Conta não encontrada');
      err.statusCode = 404;
      throw err;
    }

    if (valor > Number(conta.saldo || 0)) {
      const err = new Error('Saldo insuficiente na conta');
      err.statusCode = 400;
      throw err;
    }
  }
}

module.exports = SaldoService;
