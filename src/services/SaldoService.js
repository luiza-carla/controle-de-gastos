const Conta = require('../models/Conta');
const Carteira = require('../models/Carteira');
const { extrairContaId } = require('../utils/salarioHelpers');
const { contaEhCredito } = require('../utils/contaHelpers');
const { criarErro } = require('../utils/errorHelpers');
const {
  normalizarDinheiro,
  somarDinheiro,
  subtrairDinheiro,
} = require('../utils/money');

const MENSAGEM_SALDO_INSUFICIENTE_CARTEIRA = 'Saldo insuficiente na carteira';
const MENSAGEM_SALDO_INSUFICIENTE_CONTA = 'Saldo insuficiente na conta';
const MENSAGEM_CONTA_NAO_ENCONTRADA = 'Conta não encontrada';
const MENSAGEM_CONTA_OBRIGATORIA =
  'Conta é obrigatória para transações em conta';
const MENSAGEM_CARTAO_LIMITE = 'Limite insuficiente no cartão de crédito';
const MENSAGEM_ENTRADA_CREDITO =
  'Não é permitido lançar entradas em cartão de crédito';
const MENSAGEM_LIMITE_CREDITO_INVALIDO =
  'Limite do cartão de crédito deve ser maior que zero';

function obterSaldoNumerico(conta) {
  return normalizarDinheiro(conta?.saldo || 0);
}

function obterLimiteNumerico(conta) {
  return normalizarDinheiro(conta?.limite || 0);
}

function validarSaldoProjetadoConta(conta, saldoProjetado, delta = 0) {
  if (contaEhCredito(conta)) {
    if (delta > 0) {
      throw criarErro(400, MENSAGEM_ENTRADA_CREDITO);
    }

    const limite = obterLimiteNumerico(conta);
    if (saldoProjetado < 0 && limite <= 0) {
      throw criarErro(400, MENSAGEM_LIMITE_CREDITO_INVALIDO);
    }

    if (saldoProjetado < -limite) {
      throw criarErro(400, MENSAGEM_CARTAO_LIMITE);
    }

    return;
  }

  if (saldoProjetado < 0) {
    throw criarErro(400, MENSAGEM_SALDO_INSUFICIENTE_CONTA);
  }
}

// Serviço utilitário para aplicar ou reverter alterações de saldo em
// contas/carteira. O objetivo é centralizar a lógica que estava
// espalhada em diversos controllers e no agendador de salários.
class SaldoService {
  static obterDeltaAplicado(transacao) {
    if (!transacao) {
      return 0;
    }

    const status = transacao.status || 'pago';
    if (status !== 'pago') {
      return 0;
    }

    const valor = normalizarDinheiro(transacao.valor || 0);
    if (!valor) {
      return 0;
    }

    return transacao.tipo === 'entrada' ? valor : -valor;
  }

  static obterContaIdTransacao(transacao) {
    if (!transacao || transacao.fonteSaldo === 'carteira') {
      return null;
    }

    return extrairContaId(transacao.conta);
  }

  static obterDeltaAplicadoConta(transacao, contaId) {
    const contaIdTransacao = this.obterContaIdTransacao(transacao);
    if (!contaIdTransacao || String(contaIdTransacao) !== String(contaId)) {
      return 0;
    }

    return this.obterDeltaAplicado(transacao);
  }

  static async buscarContaObrigatoria(contaId, usuarioId) {
    const conta = await Conta.findOne({ _id: contaId, usuario: usuarioId });

    if (!conta) {
      throw criarErro(404, MENSAGEM_CONTA_NAO_ENCONTRADA);
    }

    return conta;
  }

  static async validarContaAceitaEntrada({ usuarioId, contaId, fonteSaldo }) {
    if (fonteSaldo === 'carteira') {
      return null;
    }

    if (!contaId) {
      throw criarErro(400, MENSAGEM_CONTA_OBRIGATORIA);
    }

    const conta = await this.buscarContaObrigatoria(contaId, usuarioId);

    if (contaEhCredito(conta)) {
      throw criarErro(400, MENSAGEM_ENTRADA_CREDITO);
    }

    return conta;
  }

  static async validarTransacaoProjetada({
    usuarioId,
    transacaoAnterior = null,
    transacaoNova,
  }) {
    if (!transacaoNova) {
      return;
    }

    const contaIdNova = this.obterContaIdTransacao(transacaoNova);
    if (transacaoNova.tipo === 'entrada') {
      await this.validarContaAceitaEntrada({
        usuarioId,
        contaId: contaIdNova,
        fonteSaldo: transacaoNova.fonteSaldo,
      });
    }

    const deltaCarteiraAnterior =
      this.obterDeltaAplicadoCarteira(transacaoAnterior);
    const deltaCarteiraNovo = this.obterDeltaAplicadoCarteira(transacaoNova);
    const deltaLiquidoCarteira = -deltaCarteiraAnterior + deltaCarteiraNovo;

    if (deltaLiquidoCarteira < 0) {
      const carteira = await Carteira.findOne({ usuario: usuarioId });
      const saldoCarteiraProjetado = somarDinheiro(
        carteira?.saldo || 0,
        deltaLiquidoCarteira
      );

      if (saldoCarteiraProjetado < 0) {
        throw criarErro(400, MENSAGEM_SALDO_INSUFICIENTE_CARTEIRA);
      }
    }

    const contaIds = new Set();
    const contaIdAnterior = this.obterContaIdTransacao(transacaoAnterior);

    if (contaIdAnterior) {
      contaIds.add(String(contaIdAnterior));
    }

    if (contaIdNova) {
      contaIds.add(String(contaIdNova));
    }

    for (const contaId of contaIds) {
      const conta = await this.buscarContaObrigatoria(contaId, usuarioId);
      const deltaAnterior = this.obterDeltaAplicadoConta(
        transacaoAnterior,
        contaId
      );
      const deltaNovo = this.obterDeltaAplicadoConta(transacaoNova, contaId);
      const saldoProjetado = somarDinheiro(
        subtrairDinheiro(obterSaldoNumerico(conta), deltaAnterior),
        deltaNovo
      );

      validarSaldoProjetadoConta(conta, saldoProjetado, deltaNovo);
    }
  }

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

      const conta = await this.buscarContaObrigatoria(
        contaIdNormalizada,
        usuarioId
      );
      const saldoProjetado = somarDinheiro(obterSaldoNumerico(conta), delta);

      validarSaldoProjetadoConta(
        conta,
        saldoProjetado,
        normalizarDinheiro(delta)
      );

      conta.saldo = saldoProjetado;
      await conta.save();
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
      { $inc: { saldo: normalizarDinheiro(delta) } },
      { upsert: true }
    );
  }

  /**
   * Ajusta saldo conforme os dados de uma transação.
   */
  static async aplicarMovimento(transacao, usuarioId) {
    const delta = this.obterDeltaAplicado(transacao);

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

    await this.aplicarDeltaContas({ [contaId]: delta }, usuarioId);
  }

  /**
   * Reverte a aplicação de um movimento de transação.
   */
  static async reverterMovimento(transacao, usuarioId) {
    const delta = -this.obterDeltaAplicado(transacao);

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

    await this.aplicarDeltaContas({ [contaId]: delta }, usuarioId);
  }

  /**
   * Calcula quanto da transação afetaria a carteira (positivos para entradas
   * pagas, negativos para saídas pagas).
   */
  static obterDeltaAplicadoCarteira(transacao) {
    if (!transacao || transacao.fonteSaldo !== 'carteira') {
      return 0;
    }

    return this.obterDeltaAplicado(transacao);
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
      const saldo = normalizarDinheiro(carteira?.saldo || 0);
      if (valor > saldo) {
        throw criarErro(400, MENSAGEM_SALDO_INSUFICIENTE_CARTEIRA);
      }
      return;
    }

    if (!contaId) {
      throw criarErro(400, MENSAGEM_CONTA_OBRIGATORIA);
    }

    const conta = await this.buscarContaObrigatoria(contaId, usuarioId);
    const saldoProjetado = subtrairDinheiro(obterSaldoNumerico(conta), valor);

    validarSaldoProjetadoConta(
      conta,
      saldoProjetado,
      -normalizarDinheiro(valor || 0)
    );
  }
}

module.exports = SaldoService;
