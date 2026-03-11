const Transacao = require('../models/Transacao');
const HistoricoService = require('../services/HistoricoService');
const SaldoService = require('../services/SaldoService');
const categoriaHelpers = require('../utils/categoriaHelpers');
const { criarErro } = require('../utils/errorHelpers');
const { registrarHistoricoDaRequisicao } = require('../utils/historicoHelpers');

const MENSAGEM_TRANSACAO_NAO_ENCONTRADA = 'Transação não encontrada';

// funções de saldo foram movidas para SaldoService; validação de carteira permanece

async function validarCarteiraNaoNegativaEmAtualizacao(
  usuarioId,
  transacaoAntiga,
  updateData
) {
  // simula os dados após atualização
  const transacaoSimulada = {
    ...transacaoAntiga.toObject(),
    ...updateData,
  };

  const deltaAntigo = SaldoService.obterDeltaAplicadoCarteira(transacaoAntiga);
  const deltaNovo = SaldoService.obterDeltaAplicadoCarteira(transacaoSimulada);

  const deltaLiquidoCarteira = -deltaAntigo + deltaNovo;

  if (deltaLiquidoCarteira >= 0) {
    return;
  }

  // validação centralizada para garantir que queda não deixe saldo negativo
  await SaldoService.validarSaldoDisponivel({
    usuarioId,
    contaId: null,
    fonteSaldo: 'carteira',
    valor: -deltaLiquidoCarteira,
  });
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
      data,
      status,
      recorrencia,
      parcelamento,
      tags,
      tipoDespesa,
    } = req.body;

    const fonteSaldo = conta === 'carteira' ? 'carteira' : 'conta';
    const statusFinal = status || 'pago';

    if (fonteSaldo === 'conta' && !conta) {
      throw criarErro(400, 'Conta é obrigatória');
    }

    // evita envio de saída paga que deixaria a carteira negativa
    if (
      fonteSaldo === 'carteira' &&
      statusFinal === 'pago' &&
      tipo === 'saida'
    ) {
      await SaldoService.validarSaldoDisponivel({
        usuarioId: req.user.id,
        contaId: conta,
        fonteSaldo,
        valor,
      });
    }

    // Cria nova transação no banco
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
      data: data || Date.now(),
      status: statusFinal,
      recorrencia: recorrencia || 'nenhuma',
      parcelamento: {
        totalParcelas: parcelamento?.totalParcelas || 1,
        parcelaAtual: parcelamento?.parcelaAtual || 1,
      },
      tags: tags || [],
      tipoDespesa: tipo === 'saida' ? tipoDespesa : undefined,
    });

    // Atualiza saldo da conta se transação foi marcada como paga
    if (statusFinal === 'pago') {
      await SaldoService.aplicarMovimento(novaTransacao, req.user.id);
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
    // Busca categoria salário para excluir das transações
    const categoriaSalario = await categoriaHelpers.buscarSalario();

    // Monta filtro para excluir salários das transações
    const filtro = {
      usuario: req.user.id,
    };

    if (categoriaSalario) {
      filtro.categoria = { $ne: categoriaSalario._id };
    }

    const transacoes = await populateTransacao(
      Transacao.find(filtro).sort({ data: -1 })
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
    const updateData = { ...req.body };

    const unsetOps = {};

    if (req.body.conta === 'carteira') {
      updateData.fonteSaldo = 'carteira';
      // não deixar `conta` aparecer no $set
      delete updateData.conta;
      unsetOps.conta = '';
    } else if (Object.prototype.hasOwnProperty.call(updateData, 'conta')) {
      updateData.fonteSaldo = 'conta';
    }

    await validarCarteiraNaoNegativaEmAtualizacao(
      req.user.id,
      transacaoAntiga,
      updateData
    );

    // Remove tipoDespesa se tipo não for saída
    if (updateData.tipo !== 'saida') {
      delete updateData.tipoDespesa;
    }

    // Reverte saldo anterior se transação estava paga
    if (transacaoAntiga.status === 'pago') {
      await SaldoService.reverterMovimento(transacaoAntiga, req.user.id);
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
      await SaldoService.aplicarMovimento(transacao, req.user.id);
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
      await SaldoService.reverterMovimento(transacao, req.user.id);
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
