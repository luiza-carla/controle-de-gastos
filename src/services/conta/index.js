const Conta = require('../../models/Conta');
const Transacao = require('../../models/Transacao');
const SaldoService = require('../SaldoService');
const HistoricoService = require('../historico');
const logger = require('../../utils/logger');
const { contaEhCredito } = require('../../utils/contaHelpers');
const { normalizarDadosConta } = require('./normalizacao');
const { registrarHistoricoConta } = require('./historico');
const {
  MENSAGEM_CONTA_EM_USO,
  MENSAGEM_TRANSFERENCIA_CREDITO,
  validarDadosTransferencia,
  validarContasTransferencia,
  validarContaEncontrada,
} = require('./validacoes');
const { criarErro } = require('../../utils/errorHelpers');

class ContaService {
  // Cria nova conta
  async criar(dados) {
    const conta = await Conta.create(normalizarDadosConta(dados));

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
  async atualizar(id, usuarioId, dados) {
    const filtro = { _id: id, usuario: usuarioId };
    const contaAntiga = await Conta.findOne(filtro);
    validarContaEncontrada(contaAntiga);

    const conta = await Conta.findOneAndUpdate(
      filtro,
      normalizarDadosConta(dados, contaAntiga),
      {
        returnDocument: 'after',
      }
    );

    validarContaEncontrada(conta);

    await registrarHistoricoConta({
      usuario: conta.usuario,
      conta,
      acao: 'edicao',
      dadosAnteriores: contaAntiga.toObject(),
      dadosNovos: conta.toObject(),
    });

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

      throw criarErro(409, MENSAGEM_CONTA_EM_USO);
    }

    const filtro = { _id: id, usuario: usuarioId };
    const conta = await Conta.findOne(filtro);
    validarContaEncontrada(conta);

    const resultado = await Conta.findOneAndDelete(filtro);
    validarContaEncontrada(resultado);

    await registrarHistoricoConta({
      usuario: usuarioId,
      conta,
      contaId: id,
      acao: 'delecao',
      dadosAnteriores: conta.toObject(),
    });

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

    validarContasTransferencia(contaOrigem, contaDestino);

    if (contaEhCredito(contaOrigem) || contaEhCredito(contaDestino)) {
      throw criarErro(400, MENSAGEM_TRANSFERENCIA_CREDITO);
    }

    await SaldoService.aplicarDeltaContas(
      {
        [contaOrigem._id]: -Number(valor),
        [contaDestino._id]: Number(valor),
      },
      usuarioId
    );

    const contaOrigemAtualizada = await Conta.findById(contaOrigem._id);
    const contaDestinoAtualizada = await Conta.findById(contaDestino._id);

    const saldoOrigemAnterior = contaOrigem.saldo;
    const saldoDestinoAnterior = contaDestino.saldo;

    // Registra transferência como ação única no histórico
    await HistoricoService.registrar({
      usuario: usuarioId,
      entidade: 'conta',
      entidadeId: contaOrigem._id,
      acao: 'transferencia',
      descricao: HistoricoService.formatarDescricaoTransferenciaConta(
        contaOrigemAtualizada,
        contaDestinoAtualizada,
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
        saldoOrigem: contaOrigemAtualizada.saldo,
        saldoDestino: contaDestinoAtualizada.saldo,
      },
    });

    return {
      mensagem: 'Transferência realizada com sucesso',
      contaOrigem: contaOrigemAtualizada,
      contaDestino: contaDestinoAtualizada,
    };
  }
}

module.exports = new ContaService();
