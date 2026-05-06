const Fatura = require('../../models/Fatura');
const Parcela = require('../../models/Parcela');
const { criarErro } = require('../../utils/errorHelpers');
const {
  obterNumeroSeguro,
  subtrairDinheiro,
  somarDinheiro,
} = require('../../utils/money');
const { obterLimiteDisponivel, obterLimiteTotal } = require('./limiteHelpers');
const { atualizarStatusFatura } = require('./statusHelpers');
const { adicionarMesesMantendoDia } = require('./parcelaHelpers');
const {
  MENSAGEM_LIMITE_CREDITO,
  MENSAGEM_TRANSACAO_CREDITO_INVALIDA,
} = require('./cartaoRules');

async function aplicarCompraLegada(transacao, usuarioId, cartao) {
  const valor = obterNumeroSeguro(transacao.valor);
  const fatura = await this.obterOuCriarFaturaAberta({
    usuarioId,
    cartao,
    dataReferencia: transacao.data || transacao.createdAt || new Date(),
  });

  cartao.limiteDisponivel = Math.max(
    subtrairDinheiro(obterLimiteDisponivel(cartao), valor),
    0
  );
  await cartao.save();

  fatura.valorTotal = somarDinheiro(fatura.valorTotal, valor);
  atualizarStatusFatura(fatura);
  await fatura.save();

  transacao.fatura = fatura._id;
  await transacao.save();

  return fatura;
}

async function aplicarCompra(transacao, usuarioId) {
  const cartao = await this.obterCartaoDaTransacao(transacao, usuarioId);
  if (!cartao) {
    return null;
  }

  if ((transacao.status || 'pago') !== 'pago') {
    return null;
  }

  if (transacao.tipo !== 'saida') {
    throw criarErro(400, MENSAGEM_TRANSACAO_CREDITO_INVALIDA);
  }

  const valor = obterNumeroSeguro(transacao.valor);
  if (!valor) {
    return null;
  }

  if (valor > obterLimiteDisponivel(cartao)) {
    throw criarErro(400, MENSAGEM_LIMITE_CREDITO);
  }

  const parcelasExistentes = await this.listarParcelasDaTransacao(
    transacao._id,
    usuarioId
  );

  if (!parcelasExistentes.length && transacao.fatura) {
    return aplicarCompraLegada.call(this, transacao, usuarioId, cartao);
  }

  if (parcelasExistentes.length) {
    const faturasAfetadas = await this.reatribuirParcelasAFaturas(
      transacao,
      parcelasExistentes,
      usuarioId,
      cartao
    );

    for (const faturaId of faturasAfetadas) {
      await this.recalcularFatura(faturaId);
    }

    return parcelasExistentes;
  }

  const parcelasPayload = this.construirParcelasDaTransacao(transacao);
  const faturasAfetadas = new Set();

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

  cartao.limiteDisponivel = Math.max(
    subtrairDinheiro(obterLimiteDisponivel(cartao), valor),
    0
  );
  await cartao.save();

  for (const faturaId of faturasAfetadas) {
    await this.recalcularFatura(faturaId);
  }

  transacao.fatura =
    parcelasCriadas.length === 1 ? parcelasCriadas[0].fatura : null;
  await transacao.save();

  return parcelasCriadas;
}

async function reverterCompraLegada(transacao, usuarioId, cartao) {
  const valor = obterNumeroSeguro(transacao.valor);
  const limiteTotal = obterLimiteTotal(cartao);
  cartao.limiteDisponivel = Math.min(
    limiteTotal,
    somarDinheiro(obterLimiteDisponivel(cartao), valor)
  );
  await cartao.save();

  let fatura = null;
  if (transacao.fatura) {
    fatura = await Fatura.findOne({
      _id: transacao.fatura,
      usuario: usuarioId,
    });
  }

  if (!fatura) {
    fatura = await this.obterOuCriarFaturaAberta({
      usuarioId,
      cartao,
      dataReferencia: transacao.data || transacao.createdAt || new Date(),
    });
  }

  fatura.valorTotal = Math.max(subtrairDinheiro(fatura.valorTotal, valor), 0);
  fatura.valorPago = Math.min(
    obterNumeroSeguro(fatura.valorPago),
    obterNumeroSeguro(fatura.valorTotal)
  );
  atualizarStatusFatura(fatura);
  await fatura.save();

  return fatura;
}

async function reverterCompra(transacao, usuarioId) {
  const cartao = await this.obterCartaoDaTransacao(transacao, usuarioId);
  if (!cartao) {
    return null;
  }

  if ((transacao.status || 'pago') !== 'pago' || transacao.tipo !== 'saida') {
    return null;
  }

  const parcelas = await this.listarParcelasDaTransacao(
    transacao._id,
    usuarioId
  );
  if (!parcelas.length) {
    return reverterCompraLegada.call(this, transacao, usuarioId, cartao);
  }

  const limiteTotal = obterLimiteTotal(cartao);
  const valorEmAberto = parcelas.reduce(
    (total, parcela) =>
      somarDinheiro(
        total,
        Math.max(subtrairDinheiro(parcela.valor, parcela.valorPago), 0)
      ),
    0
  );

  cartao.limiteDisponivel = Math.min(
    limiteTotal,
    somarDinheiro(obterLimiteDisponivel(cartao), valorEmAberto)
  );
  await cartao.save();

  const faturasAfetadas = [
    ...new Set(parcelas.map((parcela) => String(parcela.fatura))),
  ];

  await Parcela.deleteMany({
    usuario: usuarioId,
    transacao: transacao._id,
  });

  for (const faturaId of faturasAfetadas) {
    await this.recalcularFatura(faturaId);
  }

  return faturasAfetadas;
}

async function reatribuirParcelasAFaturas(
  transacao,
  parcelas,
  usuarioId,
  cartao
) {
  const faturasAntes = new Set(
    parcelas.map((parcela) => String(parcela.fatura))
  );
  const faturasDepois = new Set();
  const dataBase = this.obterDadosBaseParcelas(transacao);

  for (const parcela of parcelas) {
    parcela.dataCobranca = adicionarMesesMantendoDia(
      dataBase,
      parcela.numeroParcela - 1
    );

    const fatura = await this.obterOuCriarFaturaAberta({
      usuarioId,
      cartao,
      dataReferencia: parcela.dataCobranca,
    });

    parcela.fatura = fatura._id;
    faturasDepois.add(String(fatura._id));
    await parcela.save();
  }

  return new Set([...faturasAntes, ...faturasDepois]);
}

module.exports = {
  aplicarCompra,
  reverterCompra,
  reatribuirParcelasAFaturas,
};
