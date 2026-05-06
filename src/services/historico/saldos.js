const Conta = require('../../models/Conta');
const Carteira = require('../../models/Carteira');
const {
  extrairDestinoSaldo,
  salarioJaProcessadoNoMes,
} = require('../../utils/salarioHelpers');
const { normalizarSnapshotTransacao } = require('./normalizacao');
const { normalizarDinheiro } = require('../../utils/money');

async function restaurarSaldoConta(usuarioId, contaId, saldo) {
  await Conta.updateOne(
    { _id: contaId, usuario: usuarioId },
    { $set: { saldo } }
  );
}
async function ajustarSaldoCarteira(usuarioId, delta) {
  await Carteira.updateOne({ usuario: usuarioId }, { $inc: { saldo: delta } });
}

async function ajustarSaldoConta(usuarioId, contaId, delta) {
  await Conta.updateOne(
    { _id: contaId, usuario: usuarioId },
    { $inc: { saldo: delta } }
  );
}

async function restaurarSaldoCarteira(usuarioId, saldo) {
  await Carteira.updateOne({ usuario: usuarioId }, { $set: { saldo } });
}

// Ajusta saldos de conta/carteira conforme os dados de transação
// antes e depois da ação. Usado apenas durante desfazer().
async function ajustarSaldoAoReverterTransacao(
  acao,
  usuarioId,
  dadosAnteriores,
  dadosNovos
) {
  const dadosAnterioresNormalizados =
    normalizarSnapshotTransacao(dadosAnteriores);
  const dadosNovosNormalizados = normalizarSnapshotTransacao(dadosNovos);

  // helper local para calcular delta e aplicar
  const aplicarDelta = async (transacao, sinal = 1) => {
    if (!transacao || transacao.status !== 'pago') return;
    const valor = normalizarDinheiro(transacao.valor || 0);
    if (!valor) return;
    const mult = transacao.tipo === 'entrada' ? 1 : -1;
    const delta = mult * valor * sinal;

    if (transacao.fonteSaldo === 'carteira') {
      await ajustarSaldoCarteira(usuarioId, delta);
    } else if (transacao.conta) {
      await ajustarSaldoConta(usuarioId, transacao.conta, delta);
    }
  };

  switch (acao) {
    case 'criacao':
      // desfaz criação: remove movimento aplicado originalmente
      await aplicarDelta(dadosNovosNormalizados, -1);
      break;
    case 'edicao':
      // desfaz edição: primeiro reverte o movimento novo, depois reaplica o
      // antigo
      await aplicarDelta(dadosNovosNormalizados, -1);
      await aplicarDelta(dadosAnterioresNormalizados, 1);
      break;
    case 'delecao':
      // desfaz exclusão: reaplica o movimento que havia sido retirado
      await aplicarDelta(dadosAnterioresNormalizados, 1);
      break;
    default:
      break;
  }
}

async function aplicarDeltaSalario(usuarioId, salario, sinal, dataReferencia) {
  if (!salarioJaProcessadoNoMes(salario, dataReferencia)) {
    return;
  }

  const valor = normalizarDinheiro(salario?.valor || 0);
  if (!valor) {
    return;
  }

  const destino = extrairDestinoSaldo(salario);
  const delta = valor * sinal;

  if (destino.tipo === 'carteira') {
    await ajustarSaldoCarteira(usuarioId, delta);
    return;
  }

  if (destino.tipo === 'conta') {
    await ajustarSaldoConta(usuarioId, destino.contaId, delta);
  }
}

module.exports = {
  restaurarSaldoConta,
  restaurarSaldoCarteira,
  ajustarSaldoCarteira,
  ajustarSaldoConta,
  ajustarSaldoAoReverterTransacao,
  aplicarDeltaSalario,
};
