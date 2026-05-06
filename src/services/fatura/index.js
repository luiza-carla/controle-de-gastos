const mongoose = require('mongoose');
const Conta = require('../../models/Conta');
const Fatura = require('../../models/Fatura');
const Parcela = require('../../models/Parcela');
const cartaoRules = require('./cartaoRules');
const compraService = require('./compraService');
const pagamentoService = require('./pagamentoService');
const sincronizacaoTransacoes = require('./sincronizacaoTransacoes');
const faturaRepository = require('./faturaRepository');
const { STATUS_FATURA } = require('./statusHelpers');
const {
  obterPeriodoFatura,
  obterFechamentoDoMes,
} = require('../../utils/faturaHelpers');
const { addDays } = require('date-fns');

const FaturaService = {
  ...cartaoRules,
  ...faturaRepository,
  ...compraService,
  ...pagamentoService,
  ...sincronizacaoTransacoes,

  async fecharFaturasDoDia(dataReferencia = new Date()) {
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
        dataReferencia: addDays(fechamentoDoMes, 1),
      });

      cartao.dataUltimoFechamento = fechamentoDoMes;
      await cartao.save();

      totalFechadas += 1;
    }

    return totalFechadas;
  },

  async atualizarFaturasAtrasadas(dataReferencia = new Date()) {
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
  },

  async listarFaturasDoUsuario(usuarioId) {
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
  },
};

module.exports = FaturaService;
