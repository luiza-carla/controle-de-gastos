const Transacao = require('../../models/Transacao');
const Conta = require('../../models/Conta');
const ListaDesejo = require('../../models/ListaDesejo');
const { criarErro } = require('../../utils/errorHelpers');
const { normalizarSnapshotTransacao } = require('./normalizacao');
const saldos = require('./saldos');
const bloqueios = require('./bloqueios');

function garantirDadosAnteriores(dados) {
  if (!dados) throw criarErro(400, 'Dados anteriores não disponíveis');
}

async function validarBloqueio(fn, payload) {
  const motivo = await fn(payload);
  if (motivo) throw criarErro(400, motivo);
}

async function reverterCrudBasico(Model, acao, entidadeId, dadosAnteriores) {
  if (acao === 'criacao') {
    return Model.findByIdAndDelete(entidadeId);
  }

  garantirDadosAnteriores(dadosAnteriores);

  if (acao === 'edicao') {
    return Model.findByIdAndUpdate(entidadeId, dadosAnteriores);
  }

  if (acao === 'delecao') {
    return Model.create(dadosAnteriores);
  }
}

// Dispatcher com parâmetros nomeados
const handlers = {
  transacao: reverterTransacao,
  conta: reverterConta,
  carteira: reverterCarteira,
  salario: reverterSalario,
  listaDesejo: reverterListaDesejo,
};

async function reverterAcao(historico) {
  const handler = handlers[historico.entidade];

  if (!handler) {
    throw criarErro(
      400,
      `Tipo de entidade não suportado: ${historico.entidade}`
    );
  }

  return handler({
    acao: historico.acao,
    entidadeId: historico.entidadeId,
    dadosAnteriores: historico.dadosAnteriores,
    dadosNovos: historico.dadosNovos,
    usuarioId: historico.usuario,
    createdAt: historico.createdAt,
  });
}

async function reverterTransacao({
  acao,
  entidadeId,
  dadosAnteriores,
  usuarioId,
}) {
  const snapshot = normalizarSnapshotTransacao(dadosAnteriores);

  if (['delecao', 'edicao'].includes(acao)) {
    await validarBloqueio(bloqueios.obterMotivoBloqueioTransacao, {
      acao,
      usuario: usuarioId,
      dadosAnteriores: snapshot,
    });
  }

  return reverterCrudBasico(Transacao, acao, entidadeId, snapshot);
}

async function reverterConta({ acao, entidadeId, dadosAnteriores, usuarioId }) {
  if (['criacao', 'edicao', 'delecao'].includes(acao)) {
    return reverterCrudBasico(Conta, acao, entidadeId, dadosAnteriores);
  }

  if (acao === 'transferencia') {
    garantirDadosAnteriores(dadosAnteriores);

    await validarBloqueio(bloqueios.obterMotivoBloqueioConta, {
      acao,
      dadosAnteriores,
      usuario: usuarioId,
    });

    const { contaOrigemId, contaDestinoId, saldoOrigem, saldoDestino } =
      dadosAnteriores;

    await Promise.all([
      saldos.restaurarSaldoConta(usuarioId, contaOrigemId, saldoOrigem),
      saldos.restaurarSaldoConta(usuarioId, contaDestinoId, saldoDestino),
    ]);
  }
}

async function reverterCarteira({ acao, dadosAnteriores, usuarioId }) {
  if (acao !== 'transferencia') {
    throw criarErro(400, `Ação não suportada para carteira: ${acao}`);
  }

  garantirDadosAnteriores(dadosAnteriores);

  await validarBloqueio(bloqueios.obterMotivoBloqueioCarteira, {
    acao,
    dadosAnteriores,
    usuario: usuarioId,
  });

  const { carteiraSaldo, contaId, contaSaldo } = dadosAnteriores;

  await Promise.all([
    saldos.restaurarSaldoCarteira(usuarioId, carteiraSaldo),
    saldos.restaurarSaldoConta(usuarioId, contaId, contaSaldo),
  ]);
}

async function reverterSalario({
  acao,
  entidadeId,
  dadosAnteriores,
  dadosNovos,
  usuarioId,
  createdAt,
}) {
  const getRef = (dados) =>
    dados?.dataUltimoProcessamento
      ? new Date(dados.dataUltimoProcessamento)
      : new Date(createdAt || Date.now());

  if (acao === 'criacao') {
    await saldos.aplicarDeltaSalario(
      usuarioId,
      dadosNovos,
      -1,
      getRef(dadosNovos)
    );

    return Transacao.findByIdAndDelete(entidadeId);
  }

  garantirDadosAnteriores(dadosAnteriores);

  await validarBloqueio(bloqueios.obterMotivoBloqueioSalario, {
    acao,
    dadosAnteriores,
    usuario: usuarioId,
  });

  if (acao === 'edicao') {
    await saldos.aplicarDeltaSalario(
      usuarioId,
      dadosNovos,
      -1,
      getRef(dadosNovos)
    );

    await saldos.aplicarDeltaSalario(
      usuarioId,
      dadosAnteriores,
      1,
      getRef(dadosAnteriores)
    );

    return Transacao.findByIdAndUpdate(entidadeId, dadosAnteriores);
  }

  if (acao === 'delecao') {
    await Transacao.create(dadosAnteriores);

    return saldos.aplicarDeltaSalario(
      usuarioId,
      dadosAnteriores,
      1,
      getRef(dadosAnteriores)
    );
  }

  throw criarErro(400, `Ação não suportada para salário: ${acao}`);
}

async function reverterListaDesejo({
  acao,
  entidadeId,
  dadosAnteriores,
  dadosNovos,
  usuarioId,
}) {
  if (['criacao', 'edicao', 'delecao'].includes(acao)) {
    return reverterCrudBasico(ListaDesejo, acao, entidadeId, dadosAnteriores);
  }

  if (acao === 'realizacao') {
    garantirDadosAnteriores(dadosAnteriores);

    const transacao = dadosNovos?.transacaoId
      ? await Transacao.findById(dadosNovos.transacaoId)
      : null;

    if (transacao?.status === 'pago') {
      const valor = Number(transacao.valor || 0);

      if (transacao.fonteSaldo === 'carteira') {
        await saldos.ajustarSaldoCarteira(usuarioId, valor);
      } else if (transacao.conta) {
        await saldos.ajustarSaldoConta(usuarioId, transacao.conta, valor);
      }
    }

    if (dadosNovos?.transacaoId) {
      await Transacao.findByIdAndDelete(dadosNovos.transacaoId);
    }

    const existente = await ListaDesejo.findById(entidadeId);

    if (!existente) {
      await ListaDesejo.create(dadosAnteriores);
    }
  }
}

module.exports = {
  reverterTransacao,
  reverterSalario,
  reverterListaDesejo,
  reverterAcao,
  reverterCarteira,
  reverterConta,
  reverterCrudBasico,
};
