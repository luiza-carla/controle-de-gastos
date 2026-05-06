const Transacao = require('../models/Transacao');
const Conta = require('../models/Conta');
const HistoricoService = require('../services/historico');
const SaldoService = require('../services/SaldoService');
const FaturaService = require('../services/fatura');
const categoriaHelpers = require('../utils/categoriaHelpers');
const {
  validarSubcategoriaParaCategoria,
  processarSubcategoriaAoAtualizar,
} = require('../utils/subcategoriaUtils');
const { criarErro } = require('../utils/errorHelpers');
const { registrarHistoricoDaRequisicao } = require('../utils/historicoHelpers');
const { selecionarCamposPermitidos } = require('../utils/payloadHelpers');
const { contaEhCredito } = require('../utils/contaHelpers');

const MENSAGEM_TRANSACAO_NAO_ENCONTRADA = 'Transação não encontrada';
const CAMPOS_PERMITIDOS_TRANSACAO_ATUALIZACAO = [
  'conta',
  'titulo',
  'valor',
  'tipo',
  'categoria',
  'subcategoria',
  'data',
  'status',
  'recorrencia',
  'parcelamento',
  'dataPrimeiraParcela',
  'tags',
  'tipoDespesa',
];

function construirTransacaoProjetada(transacaoAntiga, updateData = {}) {
  const contaAntiga = transacaoAntiga?.conta?._id || transacaoAntiga?.conta;
  const contaAtualizada = Object.prototype.hasOwnProperty.call(
    updateData,
    'conta'
  )
    ? updateData.conta
    : contaAntiga;
  const fonteSaldo = updateData.fonteSaldo || transacaoAntiga.fonteSaldo;

  return {
    ...transacaoAntiga.toObject(),
    ...updateData,
    conta: fonteSaldo === 'carteira' ? null : contaAtualizada,
    fonteSaldo,
  };
}

// helpers de população agora vêm do utilitário central
const { transacao: populateTransacao } = require('../utils/populateHelpers');

async function buscarTransacaoDoUsuario(transacaoId, usuarioId) {
  return populateTransacao(
    Transacao.findOne({
      _id: transacaoId,
      usuario: usuarioId,
    })
  );
}

async function buscarContaDaTransacao(transacao, usuarioId) {
  const contaId = transacao?.conta?._id || transacao?.conta;
  if (!contaId) {
    return null;
  }

  return Conta.findOne({ _id: contaId, usuario: usuarioId });
}

async function validarSaldosProjetados({
  usuarioId,
  transacaoAnterior,
  transacaoNova,
}) {
  const contaAnterior = await buscarContaDaTransacao(
    transacaoAnterior,
    usuarioId
  );
  const contaNova = await buscarContaDaTransacao(transacaoNova, usuarioId);

  const envolveCredito =
    contaEhCredito(contaAnterior) || contaEhCredito(contaNova);
  const envolveSaldoTradicional =
    transacaoAnterior?.fonteSaldo === 'carteira' ||
    transacaoNova?.fonteSaldo === 'carteira' ||
    (transacaoAnterior?.fonteSaldo === 'conta' &&
      !contaEhCredito(contaAnterior)) ||
    (transacaoNova?.fonteSaldo === 'conta' && !contaEhCredito(contaNova));

  if (envolveCredito) {
    await FaturaService.validarTransacaoProjetada({
      usuarioId,
      transacaoAnterior,
      transacaoNova,
    });
  }

  if (envolveSaldoTradicional) {
    await SaldoService.validarTransacaoProjetada({
      usuarioId,
      transacaoAnterior,
      transacaoNova,
    });
  }
}

async function aplicarMovimentoTransacao(transacao, usuarioId) {
  const conta = await buscarContaDaTransacao(transacao, usuarioId);

  if (contaEhCredito(conta)) {
    await FaturaService.aplicarCompra(transacao, usuarioId);
    return;
  }

  await SaldoService.aplicarMovimento(transacao, usuarioId);
}

async function reverterMovimentoTransacao(transacao, usuarioId) {
  const conta = await buscarContaDaTransacao(transacao, usuarioId);

  if (contaEhCredito(conta)) {
    await FaturaService.reverterCompra(transacao, usuarioId);
    return;
  }

  await SaldoService.reverterMovimento(transacao, usuarioId);
}

class TransacaoController {
  // Cria nova transação e atualiza saldo da conta
  async criar(req, res) {
    // Desestrutura campos da requisição
    const {
      conta,
      titulo,
      valor,
      tipo,
      categoria,
      subcategoria,
      data,
      status,
      recorrencia,
      parcelamento,
      dataPrimeiraParcela,
      tags,
      tipoDespesa,
    } = req.body;

    const fonteSaldo = conta === 'carteira' ? 'carteira' : 'conta';
    const statusFinal = status || 'pago';

    if (fonteSaldo === 'conta' && !conta) {
      throw criarErro(400, 'Conta é obrigatória');
    }

    await validarSaldosProjetados({
      usuarioId: req.user.id,
      transacaoNova: {
        conta: fonteSaldo === 'carteira' ? null : conta,
        fonteSaldo,
        valor,
        tipo,
        status: statusFinal,
      },
    });

    // Cria nova transação no banco
    // se foi informada subcategoria, garante que ela pertence à categoria
    if (subcategoria) {
      const valido = await validarSubcategoriaParaCategoria(
        subcategoria,
        categoria
      );
      if (!valido) {
        throw criarErro(
          400,
          'Subcategoria inválida para a categoria selecionada'
        );
      }
    }

    const tipoDespesaFinal =
      tipo === 'saida' ? (tipoDespesa ? tipoDespesa : undefined) : undefined;

    const novaTransacao = await Transacao.create({
      usuario: req.user.id,
      // armazenamos null em vez de deixar o campo ausente; isso
      // simplifica consultas e garante que um objeto sempre exista
      conta: fonteSaldo === 'carteira' ? null : conta,
      fonteSaldo,
      titulo,
      valor,
      tipo,
      categoria,
      subcategoria: subcategoria || null,
      data: data || Date.now(),
      status: statusFinal,
      recorrencia: recorrencia || 'nenhuma',
      parcelamento: {
        totalParcelas: parcelamento?.totalParcelas || 1,
        parcelaAtual: parcelamento?.parcelaAtual || 1,
      },
      dataPrimeiraParcela,
      tags: tags || [],
      tipoDespesa: tipoDespesaFinal,
    });

    // Atualiza saldo da conta se transação foi marcada como paga
    if (statusFinal === 'pago') {
      await aplicarMovimentoTransacao(novaTransacao, req.user.id);
    }

    // Recupera transação completa com relações populadas
    const transacaoCompleta = await populateTransacao(
      Transacao.findById(novaTransacao._id)
    );

    // Registra no histórico
    await registrarHistoricoDaRequisicao(req, 'transacao', {
      entidadeId: novaTransacao._id,
      acao: 'criacao',
      descricao: HistoricoService.formatarDescricaoTransacao(
        'criacao',
        novaTransacao
      ),
      dadosNovos: novaTransacao.toObject(),
    });

    res.status(201).json(transacaoCompleta);
  }

  // Lista todas as transações do usuário (excluindo salários)
  async listar(req, res) {
    const salarioRefs = await categoriaHelpers.buscarSalario();
    const { filtroExclusao: filtro } = categoriaHelpers.obterFiltrosSalario(
      salarioRefs,
      req.user.id
    );

    const ordenarPor = req.query.ordenarPor || req.query.sortBy;
    const sort = ordenarPor === 'nome' ? { titulo: 1 } : { data: -1 };

    const transacoes = await populateTransacao(
      Transacao.find(filtro).setOptions({ sanitizeFilter: false }).sort(sort)
    );

    res.json(transacoes);
  }

  // Atualiza transação existente e reajusta saldos de contas
  async atualizar(req, res) {
    // Busca transação antiga para comparar alterações
    const transacaoAntiga = await buscarTransacaoDoUsuario(
      req.params.id,
      req.user.id
    );

    if (!transacaoAntiga) {
      throw criarErro(404, MENSAGEM_TRANSACAO_NAO_ENCONTRADA);
    }

    // normaliza os dados vindos do cliente
    const updateData = selecionarCamposPermitidos(
      req.body,
      CAMPOS_PERMITIDOS_TRANSACAO_ATUALIZACAO
    );

    // se precisamos apagar algum campo, acumulamos as operações em $unset
    const unsetOps = {};

    // valida subcategoria caso exista
    if (updateData.subcategoria) {
      const categoriaId = updateData.categoria || transacaoAntiga.categoria;
      const valido = await validarSubcategoriaParaCategoria(
        updateData.subcategoria,
        categoriaId
      );
      if (!valido) {
        throw criarErro(
          400,
          'Subcategoria inválida para a categoria selecionada'
        );
      }
    }

    const { unsetOps: subUnset } = await processarSubcategoriaAoAtualizar({
      updateData,
      docAntigo: transacaoAntiga,
    });

    Object.assign(unsetOps, subUnset);

    if (req.body.conta === 'carteira') {
      updateData.fonteSaldo = 'carteira';
      // não deixar `conta` aparecer no $set
      delete updateData.conta;
      unsetOps.conta = '';
    } else if (Object.prototype.hasOwnProperty.call(updateData, 'conta')) {
      updateData.fonteSaldo = 'conta';
    }

    const transacaoProjetada = construirTransacaoProjetada(
      transacaoAntiga,
      updateData
    );

    await validarSaldosProjetados({
      usuarioId: req.user.id,
      transacaoAnterior: transacaoAntiga,
      transacaoNova: transacaoProjetada,
    });

    // Remove tipoDespesa se tipo não for saída ou se for vazio
    if (updateData.tipo !== 'saida') {
      delete updateData.tipoDespesa;
    }

    if (
      Object.prototype.hasOwnProperty.call(updateData, 'tipoDespesa') &&
      !updateData.tipoDespesa
    ) {
      delete updateData.tipoDespesa;
    }

    // Reverte saldo anterior se transação estava paga
    if (transacaoAntiga.status === 'pago') {
      await reverterMovimentoTransacao(transacaoAntiga, req.user.id);
    }

    // Constrói objeto de atualização para o banco. juntamos $unset se
    // necessário para apagar o campo "conta".
    const mongoUpdate = { ...updateData };
    if (Object.keys(unsetOps).length) {
      mongoUpdate.$unset = unsetOps;
    }

    // Atualiza transação no banco
    const transacao = await populateTransacao(
      Transacao.findOneAndUpdate(
        { _id: req.params.id, usuario: req.user.id },
        mongoUpdate,
        { returnDocument: 'after' }
      )
    );

    if (transacao.status === 'pago') {
      await aplicarMovimentoTransacao(transacao, req.user.id);
    }

    // Registra no histórico
    await registrarHistoricoDaRequisicao(req, 'transacao', {
      entidadeId: transacao._id,
      acao: 'edicao',
      descricao: HistoricoService.formatarDescricaoTransacao(
        'edicao',
        transacao
      ),
      dadosAnteriores: transacaoAntiga.toObject(),
      dadosNovos: transacao.toObject(),
    });

    res.json(transacao);
  }

  // Deleta transação e reverte saldo da conta
  async deletar(req, res) {
    // Busca transação antes de deletar
    const transacao = await buscarTransacaoDoUsuario(
      req.params.id,
      req.user.id
    );

    if (!transacao) {
      throw criarErro(404, MENSAGEM_TRANSACAO_NAO_ENCONTRADA);
    }

    // Reverte saldo da conta se transação estava paga
    if (transacao.status === 'pago') {
      await reverterMovimentoTransacao(transacao, req.user.id);
    }

    // Remove transação do banco
    await Transacao.findByIdAndDelete(transacao._id);

    // Registra no histórico
    await registrarHistoricoDaRequisicao(req, 'transacao', {
      entidadeId: transacao._id,
      acao: 'delecao',
      descricao: HistoricoService.formatarDescricaoTransacao(
        'delecao',
        transacao
      ),
      dadosAnteriores: transacao.toObject(),
    });

    res.json({ mensagem: 'Transação deletada' });
  }
}

module.exports = new TransacaoController();
