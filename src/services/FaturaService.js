const mongoose = require('mongoose');
const Conta = require('../models/Conta');
const Fatura = require('../models/Fatura');
const Parcela = require('../models/Parcela');
const Transacao = require('../models/Transacao');
const { extrairContaId } = require('../utils/salarioHelpers');
const { contaEhCredito } = require('../utils/contaHelpers');
const { criarErro } = require('../utils/errorHelpers');
const {
  criarDataSeguraNoMes,
  obterPeriodoFatura,
  obterFechamentoDoMes,
  jaPassouDaData,
} = require('../utils/faturaHelpers');

const STATUS_FATURA = {
  ABERTA: 'aberta',
  FECHADA: 'fechada',
  PAGA: 'paga',
  ATRASADA: 'atrasada',
};

const STATUS_PARCELA = {
  ABERTA: 'aberta',
  PARCIAL: 'parcial',
  PAGA: 'paga',
};

const MENSAGEM_LIMITE_CREDITO = 'Limite insuficiente no cartão de crédito';
const MENSAGEM_TRANSACAO_CREDITO_INVALIDA =
  'Cartão de crédito só permite compras de saída';
const MENSAGEM_CONTA_CREDITO_INVALIDA =
  'Conta informada não é um cartão de crédito';

function obterNumeroSeguro(valor, fallback = 0) {
  const numero = Number(valor);
  return Number.isFinite(numero) ? numero : fallback;
}

function obterLimiteTotal(cartao) {
  return obterNumeroSeguro(cartao?.limite || 0);
}

function obterLimiteDisponivel(cartao) {
  const limitePadrao = obterLimiteTotal(cartao);
  return obterNumeroSeguro(cartao?.limiteDisponivel, limitePadrao);
}

function obterTotalParcelas(transacao) {
  return Math.max(1, Number(transacao?.parcelamento?.totalParcelas || 1));
}

function atualizarStatusFatura(fatura, dataReferencia = new Date()) {
  if (!fatura) {
    return null;
  }

  const valorTotal = obterNumeroSeguro(fatura.valorTotal);
  const valorPago = obterNumeroSeguro(fatura.valorPago);

  if (valorTotal > 0 && valorPago >= valorTotal) {
    fatura.status = STATUS_FATURA.PAGA;
    if (!fatura.dataPagamentoTotal) {
      fatura.dataPagamentoTotal = new Date(dataReferencia);
    }
    return fatura;
  }

  fatura.dataPagamentoTotal = null;

  if (
    valorTotal > valorPago &&
    jaPassouDaData(dataReferencia, fatura.dataVencimento)
  ) {
    fatura.status = STATUS_FATURA.ATRASADA;
    return fatura;
  }

  if (fatura.dataFechamentoReal) {
    fatura.status = STATUS_FATURA.FECHADA;
    return fatura;
  }

  fatura.status = STATUS_FATURA.ABERTA;
  return fatura;
}

function atualizarStatusParcela(parcela) {
  const valor = obterNumeroSeguro(parcela.valor);
  const valorPago = Math.min(obterNumeroSeguro(parcela.valorPago), valor);
  parcela.valorPago = valorPago;

  if (valorPago >= valor && valor > 0) {
    parcela.status = STATUS_PARCELA.PAGA;
    return parcela;
  }

  if (valorPago > 0) {
    parcela.status = STATUS_PARCELA.PARCIAL;
    return parcela;
  }

  parcela.status = STATUS_PARCELA.ABERTA;
  return parcela;
}

function ratearValorParcelado(valorTotal, totalParcelas) {
  const quantidade = Math.max(Number(totalParcelas) || 1, 1);
  const valorEmCentavos = Math.round(obterNumeroSeguro(valorTotal) * 100);
  const base = Math.floor(valorEmCentavos / quantidade);
  const resto = valorEmCentavos % quantidade;

  return Array.from({ length: quantidade }, (_, index) => {
    const valorParcela = base + (index < resto ? 1 : 0);
    return valorParcela / 100;
  });
}

function adicionarMesesMantendoDia(dataBase, quantidadeMeses) {
  const data = new Date(dataBase);
  const ano = data.getFullYear();
  const mes = data.getMonth() + quantidadeMeses;
  const dia = data.getDate();

  return criarDataSeguraNoMes(ano, mes, dia);
}

class FaturaService {
  static async buscarCartaoCredito(contaId, usuarioId) {
    const cartao = await Conta.findOne({ _id: contaId, usuario: usuarioId });

    if (!cartao) {
      throw criarErro(404, 'Conta não encontrada');
    }

    if (!contaEhCredito(cartao)) {
      throw criarErro(400, MENSAGEM_CONTA_CREDITO_INVALIDA);
    }

    return cartao;
  }

  static async obterCartaoDaTransacao(transacao, usuarioId) {
    if (!transacao || transacao.fonteSaldo !== 'conta') {
      return null;
    }

    const contaId = extrairContaId(transacao.conta);
    if (!contaId) {
      return null;
    }

    const conta = await Conta.findOne({ _id: contaId, usuario: usuarioId });
    if (!contaEhCredito(conta)) {
      return null;
    }

    return conta;
  }

  static async obterOuCriarFaturaAberta({ usuarioId, cartao, dataReferencia }) {
    const periodo = obterPeriodoFatura(
      dataReferencia,
      cartao.diaFechamento,
      cartao.diaVencimento
    );

    const filtro = {
      usuario: usuarioId,
      conta: cartao._id,
      periodoInicio: periodo.periodoInicio,
      periodoFim: periodo.periodoFim,
    };

    let fatura = await Fatura.findOne(filtro);
    if (!fatura) {
      fatura = await Fatura.create({
        ...filtro,
        dataFechamento: periodo.dataFechamento,
        dataVencimento: periodo.dataVencimento,
        valorTotal: 0,
        valorPago: 0,
        status: STATUS_FATURA.ABERTA,
      });
    }

    return fatura;
  }

  static obterDadosBaseParcelas(transacao) {
    return new Date(
      transacao.dataPrimeiraParcela ||
        transacao.data ||
        transacao.createdAt ||
        new Date()
    );
  }

  static async reatribuirParcelasAFaturas(
    transacao,
    parcelas,
    usuarioId,
    cartao
  ) {
    const faturasAntes = new Set(
      parcelas.map((parcela) => String(parcela.fatura))
    );
    const faturasDepois = new Set();
    const dataBase = await this.obtendoDadosBaseParcelas(transacao);

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

  static async listarParcelasDaTransacao(transacaoId, usuarioId) {
    return Parcela.find({
      usuario: usuarioId,
      transacao: transacaoId,
    }).sort({ numeroParcela: 1, dataCobranca: 1 });
  }

  static async obterValorEmAbertoDaTransacao(transacao, usuarioId) {
    if (!transacao || transacao.fonteSaldo !== 'conta') {
      return 0;
    }

    if ((transacao.status || 'pago') !== 'pago' || transacao.tipo !== 'saida') {
      return 0;
    }

    if (!transacao._id) {
      return obterNumeroSeguro(transacao.valor);
    }

    const parcelas = await this.listarParcelasDaTransacao(
      transacao._id,
      usuarioId
    );
    if (!parcelas.length) {
      return obterNumeroSeguro(transacao.valor);
    }

    return parcelas.reduce(
      (total, parcela) =>
        total +
        Math.max(
          obterNumeroSeguro(parcela.valor) -
            obterNumeroSeguro(parcela.valorPago),
          0
        ),
      0
    );
  }

  static async recalcularFatura(faturaId, dataReferencia = new Date()) {
    const fatura = await Fatura.findById(faturaId);
    if (!fatura) {
      return null;
    }

    const parcelas = await Parcela.find({ fatura: fatura._id });
    fatura.valorTotal = parcelas.reduce(
      (total, parcela) => total + obterNumeroSeguro(parcela.valor),
      0
    );
    fatura.valorPago = parcelas.reduce(
      (total, parcela) => total + obterNumeroSeguro(parcela.valorPago),
      0
    );

    atualizarStatusFatura(fatura, dataReferencia);
    await fatura.save();
    return fatura;
  }

  static construirParcelasDaTransacao(transacao) {
    const totalParcelas = obterTotalParcelas(transacao);
    const valoresParcelas = ratearValorParcelado(
      transacao.valor,
      totalParcelas
    );
    const dataBase =
      transacao.dataPrimeiraParcela ||
      transacao.data ||
      transacao.createdAt ||
      new Date();

    return valoresParcelas.map((valorParcela, index) => ({
      usuario: transacao.usuario,
      transacao: transacao._id,
      conta: transacao.conta,
      titulo: transacao.titulo,
      numeroParcela: index + 1,
      totalParcelas,
      valor: valorParcela,
      valorPago: 0,
      dataCompra: dataBase,
      dataCobranca: adicionarMesesMantendoDia(dataBase, index),
      status: STATUS_PARCELA.ABERTA,
    }));
  }

  static async validarTransacaoProjetada({
    usuarioId,
    transacaoAnterior = null,
    transacaoNova = null,
  }) {
    const contaIds = new Set();

    const contaIdAnterior = extrairContaId(transacaoAnterior?.conta);
    const contaIdNova = extrairContaId(transacaoNova?.conta);

    if (contaIdAnterior) {
      const contaAnterior = await Conta.findOne({
        _id: contaIdAnterior,
        usuario: usuarioId,
      });
      if (contaEhCredito(contaAnterior)) {
        contaIds.add(String(contaIdAnterior));
      }
    }

    if (contaIdNova) {
      const contaNova = await Conta.findOne({
        _id: contaIdNova,
        usuario: usuarioId,
      });
      if (contaEhCredito(contaNova)) {
        contaIds.add(String(contaIdNova));
      }
    }

    for (const contaId of contaIds) {
      const cartao = await this.buscarCartaoCredito(contaId, usuarioId);

      if (
        transacaoNova &&
        String(extrairContaId(transacaoNova.conta)) === String(contaId) &&
        transacaoNova.tipo !== 'saida'
      ) {
        throw criarErro(400, MENSAGEM_TRANSACAO_CREDITO_INVALIDA);
      }

      const valorRestauradoAnterior =
        transacaoAnterior &&
        String(extrairContaId(transacaoAnterior.conta)) === String(contaId)
          ? await this.obterValorEmAbertoDaTransacao(
              transacaoAnterior,
              usuarioId
            )
          : 0;

      const valorNovo =
        transacaoNova &&
        String(extrairContaId(transacaoNova.conta)) === String(contaId) &&
        (transacaoNova.status || 'pago') === 'pago' &&
        transacaoNova.tipo === 'saida'
          ? obterNumeroSeguro(transacaoNova.valor)
          : 0;

      const limiteProjetado =
        obterLimiteDisponivel(cartao) + valorRestauradoAnterior - valorNovo;

      if (limiteProjetado < 0) {
        throw criarErro(400, MENSAGEM_LIMITE_CREDITO);
      }
    }
  }

  static async aplicarCompraLegada(transacao, usuarioId, cartao) {
    const valor = obterNumeroSeguro(transacao.valor);
    const fatura = await this.obterOuCriarFaturaAberta({
      usuarioId,
      cartao,
      dataReferencia: transacao.data || transacao.createdAt || new Date(),
    });

    cartao.limiteDisponivel = Math.max(
      obterLimiteDisponivel(cartao) - valor,
      0
    );
    await cartao.save();

    fatura.valorTotal = obterNumeroSeguro(fatura.valorTotal) + valor;
    atualizarStatusFatura(fatura);
    await fatura.save();

    transacao.fatura = fatura._id;
    await transacao.save();

    return fatura;
  }

  static async aplicarCompra(transacao, usuarioId) {
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
      return this.aplicarCompraLegada(transacao, usuarioId, cartao);
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
      obterLimiteDisponivel(cartao) - valor,
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

  static async reverterCompraLegada(transacao, usuarioId, cartao) {
    const valor = obterNumeroSeguro(transacao.valor);
    const limiteTotal = obterLimiteTotal(cartao);
    cartao.limiteDisponivel = Math.min(
      limiteTotal,
      obterLimiteDisponivel(cartao) + valor
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

    fatura.valorTotal = Math.max(
      obterNumeroSeguro(fatura.valorTotal) - valor,
      0
    );
    fatura.valorPago = Math.min(
      obterNumeroSeguro(fatura.valorPago),
      obterNumeroSeguro(fatura.valorTotal)
    );
    atualizarStatusFatura(fatura);
    await fatura.save();

    return fatura;
  }

  static async reverterCompra(transacao, usuarioId) {
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
      return this.reverterCompraLegada(transacao, usuarioId, cartao);
    }

    const limiteTotal = obterLimiteTotal(cartao);
    const valorEmAberto = parcelas.reduce(
      (total, parcela) =>
        total +
        Math.max(
          obterNumeroSeguro(parcela.valor) -
            obterNumeroSeguro(parcela.valorPago),
          0
        ),
      0
    );

    cartao.limiteDisponivel = Math.min(
      limiteTotal,
      obterLimiteDisponivel(cartao) + valorEmAberto
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

  static async registrarPagamento({ faturaId, usuarioId, valor }) {
    const fatura = await Fatura.findOne({ _id: faturaId, usuario: usuarioId });
    if (!fatura) {
      throw criarErro(404, 'Fatura não encontrada');
    }

    const valorPagamento = obterNumeroSeguro(valor);
    if (valorPagamento <= 0) {
      throw criarErro(400, 'Valor de pagamento inválido');
    }

    const parcelas = await Parcela.find({
      fatura: fatura._id,
      usuario: usuarioId,
    }).sort({
      dataCobranca: 1,
      numeroParcela: 1,
      createdAt: 1,
    });

    if (!parcelas.length) {
      throw criarErro(400, 'Fatura não possui parcelas para pagamento');
    }

    let valorRestante = valorPagamento;
    let valorAplicado = 0;

    for (const parcela of parcelas) {
      if (valorRestante <= 0) {
        break;
      }

      const valorEmAberto = Math.max(
        obterNumeroSeguro(parcela.valor) - obterNumeroSeguro(parcela.valorPago),
        0
      );

      if (!valorEmAberto) {
        continue;
      }

      const pagamentoParcela = Math.min(valorRestante, valorEmAberto);
      parcela.valorPago =
        obterNumeroSeguro(parcela.valorPago) + pagamentoParcela;
      atualizarStatusParcela(parcela);
      await parcela.save();

      valorRestante -= pagamentoParcela;
      valorAplicado += pagamentoParcela;
    }

    if (valorAplicado <= 0) {
      throw criarErro(400, 'Fatura já está totalmente paga');
    }

    const cartao = await this.buscarCartaoCredito(fatura.conta, usuarioId);
    const limiteTotal = obterLimiteTotal(cartao);
    cartao.limiteDisponivel = Math.min(
      limiteTotal,
      obterLimiteDisponivel(cartao) + valorAplicado
    );
    await cartao.save();

    return this.recalcularFatura(fatura._id);
  }

  static async fecharFaturasDoDia(dataReferencia = new Date()) {
    const contasCredito = await Conta.find({ tipo: 'credito', ativa: true });
    let totalFechadas = 0;

    for (const cartao of contasCredito) {
      const fechamentoDoMes = obterFechamentoDoMes(
        dataReferencia,
        cartao.diaFechamento
      );
      const ultimoFechamento = cartao.dataUltimoFechamento
        ? new Date(cartao.dataUltimoFechamento)
        : null;

      if (fechamentoDoMes > dataReferencia) {
        continue;
      }

      if (
        ultimoFechamento &&
        ultimoFechamento.getTime() >= fechamentoDoMes.getTime()
      ) {
        continue;
      }

      const periodo = obterPeriodoFatura(
        fechamentoDoMes,
        cartao.diaFechamento,
        cartao.diaVencimento
      );

      let fatura = await Fatura.findOne({
        usuario: cartao.usuario,
        conta: cartao._id,
        periodoInicio: periodo.periodoInicio,
        periodoFim: periodo.periodoFim,
      });

      if (!fatura) {
        fatura = await Fatura.create({
          usuario: cartao.usuario,
          conta: cartao._id,
          periodoInicio: periodo.periodoInicio,
          periodoFim: periodo.periodoFim,
          dataFechamento: periodo.dataFechamento,
          dataVencimento: periodo.dataVencimento,
          valorTotal: 0,
          valorPago: 0,
          status: STATUS_FATURA.ABERTA,
        });
      }

      fatura.dataFechamentoReal = fechamentoDoMes;
      await fatura.save();
      await this.recalcularFatura(fatura._id, dataReferencia);

      await this.obterOuCriarFaturaAberta({
        usuarioId: cartao.usuario,
        cartao,
        dataReferencia: new Date(fechamentoDoMes.getTime() + 86400000),
      });

      cartao.dataUltimoFechamento = fechamentoDoMes;
      await cartao.save();

      totalFechadas += 1;
    }

    return totalFechadas;
  }

  static async atualizarFaturasAtrasadas(dataReferencia = new Date()) {
    const faturas = await Fatura.find({
      status: mongoose.trusted({
        $in: [STATUS_FATURA.FECHADA, STATUS_FATURA.ATRASADA],
      }),
    });

    let atualizadas = 0;
    for (const fatura of faturas) {
      const statusAnterior = fatura.status;
      await this.recalcularFatura(fatura._id, dataReferencia);
      const faturaAtualizada = await Fatura.findById(fatura._id);
      if (faturaAtualizada && statusAnterior !== faturaAtualizada.status) {
        atualizadas += 1;
      }
    }

    return atualizadas;
  }

  static async sincronizarTransacoesCreditoDoUsuario(usuarioId) {
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

  static async listarFaturasDoUsuario(usuarioId) {
    await this.sincronizarTransacoesCreditoDoUsuario(usuarioId);

    const faturas = await Fatura.find({ usuario: usuarioId })
      .populate('conta', 'nome tipo limite limiteDisponivel')
      .sort({ dataVencimento: -1, createdAt: -1 })
      .lean();

    if (!faturas.length) {
      return [];
    }

    const faturaIds = faturas.map((fatura) => fatura._id);
    const parcelas = await Parcela.find({
      usuario: usuarioId,
      fatura: mongoose.trusted({ $in: faturaIds }),
    })
      .populate('transacao', 'titulo valor data parcelamento')
      .sort({ dataCobranca: 1, numeroParcela: 1, createdAt: 1 })
      .lean();

    const parcelasPorFatura = new Map();
    for (const parcela of parcelas) {
      const chave = String(parcela.fatura);
      const lista = parcelasPorFatura.get(chave) || [];
      lista.push(parcela);
      parcelasPorFatura.set(chave, lista);
    }

    return faturas.map((fatura) => ({
      ...fatura,
      parcelas: parcelasPorFatura.get(String(fatura._id)) || [],
    }));
  }
}

module.exports = FaturaService;
