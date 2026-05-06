const mongoose = require('mongoose');
const Conta = require('../../models/Conta');
const Parcela = require('../../models/Parcela');
const Transacao = require('../../models/Transacao');

async function sincronizarTransacoesCreditoDoUsuario(usuarioId) {
  const cartoes = await Conta.find({
    usuario: usuarioId,
    tipo: 'credito',
  });

  if (!cartoes.length) {
    return;
  }

  const cartoesPorId = new Map(
    cartoes.map((cartao) => [String(cartao._id), cartao])
  );
  const transacoes = await Transacao.find({
    usuario: usuarioId,
    fonteSaldo: 'conta',
    tipo: 'saida',
    status: 'pago',
    conta: mongoose.trusted({ $in: cartoes.map((cartao) => cartao._id) }),
  }).sort({ data: 1, createdAt: 1 });

  const faturasAfetadas = new Set();

  for (const transacao of transacoes) {
    const parcelasExistentes = await Parcela.countDocuments({
      usuario: usuarioId,
      transacao: transacao._id,
    });

    if (parcelasExistentes > 0) {
      continue;
    }

    const cartao = cartoesPorId.get(String(transacao.conta));
    if (!cartao) {
      continue;
    }

    const parcelasPayload = this.construirParcelasDaTransacao(transacao);
    for (const parcela of parcelasPayload) {
      const fatura = await this.obterOuCriarFaturaAberta({
        usuarioId,
        cartao,
        dataReferencia: parcela.dataCobranca,
      });
      parcela.fatura = fatura._id;
      faturasAfetadas.add(String(fatura._id));
    }

    const parcelasCriadas = await Parcela.insertMany(parcelasPayload);
    transacao.fatura =
      parcelasCriadas.length === 1 ? parcelasCriadas[0].fatura : null;
    await transacao.save();
  }

  for (const faturaId of faturasAfetadas) {
    await this.recalcularFatura(faturaId);
  }
}

module.exports = {
  sincronizarTransacoesCreditoDoUsuario,
};
