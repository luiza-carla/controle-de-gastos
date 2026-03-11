const Conta = require('../models/Conta');
const Transacao = require('../models/Transacao');
const HistoricoService = require('./HistoricoService');
const { criarErro } = require('../utils/errorHelpers');
const logger = require('../utils/logger');

const MENSAGEM_CONTA_EM_USO =
  'Não é possível apagar a conta pois existem transações ou salários associados.';

async function registrarHistoricoConta({
  usuario,
  conta,
  contaId,
  acao,
  dadosAnteriores,
  dadosNovos,
}) {
  await HistoricoService.registrar({
    usuario,
    entidade: 'conta',
    entidadeId: contaId || conta?._id,
    acao,
    descricao: HistoricoService.formatarDescricaoConta(acao, conta),
    dadosAnteriores,
    dadosNovos,
  });
}

function validarDadosTransferencia(contaDestinoId, valor) {
  if (!contaDestinoId || !valor || valor <= 0) {
    throw criarErro(400, 'Conta destino e valor são obrigatórios');
  }
}

function validarContasTransferencia(contaOrigem, contaDestino, valor) {
  if (!contaOrigem) {
    throw criarErro(404, 'Conta de origem não encontrada');
  }

  if (!contaDestino) {
    throw criarErro(404, 'Conta de destino não encontrada');
  }

  if (contaOrigem.saldo < valor) {
    throw criarErro(400, 'Saldo insuficiente na conta de origem');
  }
}

class ContaService {
  // Cria nova conta
  async criar(dados) {
    const conta = await Conta.create(dados);

    await registrarHistoricoConta({
      usuario: dados.usuario,
      conta,
      acao: 'criacao',
      dadosNovos: conta.toObject(),
    });

    return conta;
  }

  // Lista todas as contas do usuário
  async listar(usuarioId) {
    return Conta.find({ usuario: usuarioId }).sort({ createdAt: -1 });
  }

  // Busca conta por ID
  async buscarPorId(id) {
    return Conta.findById(id);
  }

  // Atualiza dados de uma conta
  async atualizar(id, dados) {
    const contaAntiga = await Conta.findById(id);
    const conta = await Conta.findByIdAndUpdate(id, dados, {
      returnDocument: 'after',
    });

    if (conta && contaAntiga) {
      await registrarHistoricoConta({
        usuario: conta.usuario,
        conta,
        acao: 'edicao',
        dadosAnteriores: contaAntiga.toObject(),
        dadosNovos: conta.toObject(),
      });
    }

    return conta;
  }

  // Deleta conta se não houver transações associadas
  async deletar(id, usuarioId) {
    const transCount = await Transacao.countDocuments({
      conta: id,
      usuario: usuarioId,
      fonteSaldo: 'conta',
    });

    if (transCount > 0) {
      // log para facilitar depuração em ambientes de desenvolvimento
      if (process.env.NODE_ENV !== 'production') {
        const exemplos = await Transacao.find({
          conta: id,
          usuario: usuarioId,
          fonteSaldo: 'conta',
        })
          .limit(5)
          .select('_id titulo categoria');
        logger?.info(
          `Conta ${id} está bloqueada por ${transCount} transacao(ões): ${JSON.stringify(
            exemplos
          )}`,
          'ContaService'
        );
      }

      throw criarErro(400, MENSAGEM_CONTA_EM_USO);
    }

    const conta = await Conta.findById(id);
    const resultado = await Conta.findByIdAndDelete(id);

    if (conta) {
      await registrarHistoricoConta({
        usuario: usuarioId,
        conta,
        contaId: id,
        acao: 'delecao',
        dadosAnteriores: conta.toObject(),
      });
    }

    return resultado;
  }

  // Transfere valor entre contas do mesmo usuário
  async transferir(contaOrigemId, contaDestinoId, valor, usuarioId) {
    validarDadosTransferencia(contaDestinoId, valor);

    const contaOrigem = await Conta.findOne({
      _id: contaOrigemId,
      usuario: usuarioId,
    });

    const contaDestino = await Conta.findOne({
      _id: contaDestinoId,
      usuario: usuarioId,
    });

    validarContasTransferencia(contaOrigem, contaDestino, valor);

    const saldoOrigemAnterior = contaOrigem.saldo;
    const saldoDestinoAnterior = contaDestino.saldo;

    contaOrigem.saldo -= valor;
    contaDestino.saldo += valor;

    await contaOrigem.save();
    await contaDestino.save();

    // Registra transferência como ação única no histórico
    await HistoricoService.registrar({
      usuario: usuarioId,
      entidade: 'conta',
      entidadeId: contaOrigem._id,
      acao: 'transferencia',
      descricao: HistoricoService.formatarDescricaoTransferenciaConta(
        contaOrigem,
        contaDestino,
        valor
      ),
      dadosAnteriores: {
        contaOrigemId: contaOrigem._id,
        contaDestinoId: contaDestino._id,
        saldoOrigem: saldoOrigemAnterior,
        saldoDestino: saldoDestinoAnterior,
      },
      dadosNovos: {
        contaOrigemId: contaOrigem._id,
        contaDestinoId: contaDestino._id,
        saldoOrigem: contaOrigem.saldo,
        saldoDestino: contaDestino.saldo,
      },
    });

    return {
      mensagem: 'Transferência realizada com sucesso',
      contaOrigem,
      contaDestino,
    };
  }
}

module.exports = new ContaService();
