const Carteira = require('../../models/Carteira');
const { contaEhCredito } = require('../../utils/contaHelpers');
const { criarErro } = require('../../utils/errorHelpers');
const {
  normalizarDinheiro,
  somarDinheiro,
  subtrairDinheiro,
} = require('../../utils/money');
const { buscarContaObrigatoria } = require('./contaRepository');
const {
  obterDeltaAplicadoCarteira,
  obterDeltaAplicadoConta,
  obterContaIdTransacao,
} = require('./deltaHelpers');

const MENSAGEM_SALDO_INSUFICIENTE_CARTEIRA = 'Saldo insuficiente na carteira';
const MENSAGEM_SALDO_INSUFICIENTE_CONTA = 'Saldo insuficiente na conta';
const MENSAGEM_CONTA_OBRIGATORIA =
  'Conta é obrigatória para transações em conta';
const MENSAGEM_CARTAO_LIMITE = 'Limite insuficiente no cartão de crédito';
const MENSAGEM_ENTRADA_CREDITO =
  'Não é permitido lançar entradas em cartão de crédito';
const MENSAGEM_LIMITE_CREDITO_INVALIDO =
  'Limite do cartão de crédito deve ser maior que zero';

// Normaliza o saldo atual da conta antes das validações.
function obterSaldoNumerico(conta) {
  return normalizarDinheiro(conta?.saldo || 0);
}

// Normaliza o limite configurado para contas de crédito.
function obterLimiteNumerico(conta) {
  return normalizarDinheiro(conta?.limite || 0);
}

// Garante que o saldo projetado respeita as regras da conta informada.
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

// Valida se a transação de entrada pode ser vinculada à conta indicada.
async function validarContaAceitaEntrada({ usuarioId, contaId, fonteSaldo }) {
  if (fonteSaldo === 'carteira') {
    return null;
  }

  if (!contaId) {
    throw criarErro(400, MENSAGEM_CONTA_OBRIGATORIA);
  }

  const conta = await buscarContaObrigatoria(contaId, usuarioId);

  if (contaEhCredito(conta)) {
    throw criarErro(400, MENSAGEM_ENTRADA_CREDITO);
  }

  return conta;
}

// Simula a transação antes da persistência para evitar saldo ou limite inválido.
async function validarTransacaoProjetada({
  usuarioId,
  transacaoAnterior = null,
  transacaoNova,
}) {
  if (!transacaoNova) {
    return;
  }

  const contaIdNova = obterContaIdTransacao(transacaoNova);
  if (transacaoNova.tipo === 'entrada') {
    await validarContaAceitaEntrada({
      usuarioId,
      contaId: contaIdNova,
      fonteSaldo: transacaoNova.fonteSaldo,
    });
  }

  const deltaCarteiraAnterior = obterDeltaAplicadoCarteira(transacaoAnterior);
  const deltaCarteiraNovo = obterDeltaAplicadoCarteira(transacaoNova);
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
  const contaIdAnterior = obterContaIdTransacao(transacaoAnterior);

  if (contaIdAnterior) {
    contaIds.add(String(contaIdAnterior));
  }

  if (contaIdNova) {
    contaIds.add(String(contaIdNova));
  }

  for (const contaId of contaIds) {
    const conta = await buscarContaObrigatoria(contaId, usuarioId);
    const deltaAnterior = obterDeltaAplicadoConta(transacaoAnterior, contaId);
    const deltaNovo = obterDeltaAplicadoConta(transacaoNova, contaId);
    const saldoProjetado = somarDinheiro(
      subtrairDinheiro(obterSaldoNumerico(conta), deltaAnterior),
      deltaNovo
    );

    validarSaldoProjetadoConta(conta, saldoProjetado, deltaNovo);
  }
}

/**
 * Verifica se há saldo disponível para a operação indicada (carteira ou conta).
 */
async function validarSaldoDisponivel({
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

  const conta = await buscarContaObrigatoria(contaId, usuarioId);
  const saldoProjetado = subtrairDinheiro(obterSaldoNumerico(conta), valor);

  validarSaldoProjetadoConta(
    conta,
    saldoProjetado,
    -normalizarDinheiro(valor || 0)
  );
}

module.exports = {
  validarSaldoProjetadoConta,
  validarContaAceitaEntrada,
  validarTransacaoProjetada,
  validarSaldoDisponivel,
};
