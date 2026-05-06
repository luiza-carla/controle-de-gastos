const Fatura = require('../../models/Fatura');
const Parcela = require('../../models/Parcela');
const { criarErro } = require('../../utils/errorHelpers');
const {
  somarDinheiro,
  subtrairDinheiro,
  obterNumeroSeguro,
} = require('../../utils/money');
const { atualizarStatusParcela } = require('./statusHelpers');
const { obterLimiteDisponivel, obterLimiteTotal } = require('./limiteHelpers');

async function registrarPagamento({ faturaId, usuarioId, valor }) {
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
      subtrairDinheiro(parcela.valor, parcela.valorPago),
      0
    );

    if (!valorEmAberto) {
      continue;
    }

    const pagamentoParcela = Math.min(valorRestante, valorEmAberto);
    parcela.valorPago = somarDinheiro(parcela.valorPago, pagamentoParcela);
    atualizarStatusParcela(parcela);
    await parcela.save();

    valorRestante = subtrairDinheiro(valorRestante, pagamentoParcela);
    valorAplicado = somarDinheiro(valorAplicado, pagamentoParcela);
  }

  if (valorAplicado <= 0) {
    throw criarErro(400, 'Fatura já está totalmente paga');
  }

  const cartao = await this.buscarCartaoCredito(fatura.conta, usuarioId);
  const limiteTotal = obterLimiteTotal(cartao);
  cartao.limiteDisponivel = Math.min(
    limiteTotal,
    somarDinheiro(obterLimiteDisponivel(cartao), valorAplicado)
  );
  await cartao.save();

  return this.recalcularFatura(fatura._id);
}

module.exports = {
  registrarPagamento,
};
