const Carteira = require('../../models/Carteira');
const { extrairContaId } = require('../../utils/salarioHelpers');
const { normalizarDinheiro, somarDinheiro } = require('../../utils/money');

const { buscarContaObrigatoria } = require('./contaRepository');
const {
  obterDeltaAplicado,
  obterContaIdTransacao,
  obterDeltaAplicadoCarteira,
  obterDeltaAplicadoConta,
} = require('./deltaHelpers');
const {
  validarSaldoProjetadoConta,
  validarContaAceitaEntrada,
  validarTransacaoProjetada,
  validarSaldoDisponivel,
} = require('./validacoes');

// Normaliza o saldo da conta para garantir operações numéricas consistentes.
function obterSaldoNumerico(conta) {
  return normalizarDinheiro(conta?.saldo || 0);
}

// Serviço utilitário para aplicar ou reverter alterações de saldo em
// contas/carteira.
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

  static obterDeltaAplicado = obterDeltaAplicado;
  static obterContaIdTransacao = obterContaIdTransacao;
  static obterDeltaAplicadoConta = obterDeltaAplicadoConta;
  static obterDeltaAplicadoCarteira = obterDeltaAplicadoCarteira;
  static buscarContaObrigatoria = buscarContaObrigatoria;
  static validarContaAceitaEntrada = validarContaAceitaEntrada;
  static validarTransacaoProjetada = validarTransacaoProjetada;
  static validarSaldoDisponivel = validarSaldoDisponivel;
}

module.exports = SaldoService;
