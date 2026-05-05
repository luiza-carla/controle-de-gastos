const Conta = require('../../models/Conta');
const { extrairDestinoSaldo } = require('../../utils/salarioHelpers');
const { normalizarSnapshotTransacao } = require('./normalizacao');

async function obterMotivoBloqueioPorObjetoRemovido(
  historico,
  buscarObjetoRelacionado
) {
  if (!['criacao', 'edicao'].includes(historico.acao)) {
    return null;
  }

  const objetoRelacionado = await buscarObjetoRelacionado(
    historico.entidade,
    historico.entidadeId,
    historico.usuario
  );

  if (objetoRelacionado) {
    return null;
  }

  return formatarMotivoBloqueioDesfazer(
    'esta ação',
    obterDescricaoEntidadeRemovida(historico.entidade)
  );
}

async function obterMotivoBloqueioTransacao(historico) {
  if (!['delecao', 'edicao'].includes(historico.acao)) {
    return null;
  }

  const snapshotTransacao = normalizarSnapshotTransacao(
    historico.dadosAnteriores
  );
  const destino = extrairDestinoSaldo(snapshotTransacao);

  if (destino.tipo !== 'conta' || !destino.contaId) {
    return null;
  }

  const contaExiste = await contaExisteParaUsuario(
    destino.contaId,
    historico.usuario
  );

  if (contaExiste) {
    return null;
  }

  return formatarMotivoContaRemovida('transação', 'associada');
}

async function obterMotivoBloqueioSalario(historico) {
  if (!['delecao', 'edicao'].includes(historico.acao)) {
    return null;
  }

  const destino = extrairDestinoSaldo(historico.dadosAnteriores);
  if (destino.tipo !== 'conta' || !destino.contaId) {
    return null;
  }

  const contaExiste = await contaExisteParaUsuario(
    destino.contaId,
    historico.usuario
  );

  if (contaExiste) {
    return null;
  }

  if (historico.acao === 'edicao') {
    return formatarMotivoContaRemovida('edição do salário', 'de destino');
  }

  return formatarMotivoContaRemovida('exclusão do salário', 'de destino');
}

async function obterMotivoBloqueioConta(historico) {
  if (historico.acao !== 'transferencia') {
    return null;
  }

  const { contaOrigemId, contaDestinoId } = historico.dadosAnteriores || {};

  const [origemExiste, destinoExiste] = await Promise.all([
    contaExisteParaUsuario(contaOrigemId, historico.usuario),
    contaExisteParaUsuario(contaDestinoId, historico.usuario),
  ]);

  if (!origemExiste && !destinoExiste) {
    return formatarMotivoBloqueioDesfazer(
      'transferência entre contas',
      'as contas de origem e destino foram removidas'
    );
  }

  if (!origemExiste) {
    return formatarMotivoContaRemovida(
      'transferência entre contas',
      'de origem'
    );
  }

  if (!destinoExiste) {
    return formatarMotivoContaRemovida(
      'transferência entre contas',
      'de destino'
    );
  }

  return null;
}

async function obterMotivoBloqueioCarteira(historico) {
  if (historico.acao !== 'transferencia') {
    return null;
  }

  const contaId = historico.dadosAnteriores?.contaId;
  if (!contaId) {
    return null;
  }

  const contaExiste = await contaExisteParaUsuario(contaId, historico.usuario);

  if (contaExiste) {
    return null;
  }

  return formatarMotivoContaRemovida('transferência da carteira', 'associada');
}

async function obterMotivoBloqueioDesfazer(historico, buscarObjetoRelacionado) {
  if (!historico || historico.desfeito) {
    return null;
  }

  const motivoObjetoRemovido = await obterMotivoBloqueioPorObjetoRemovido(
    historico,
    buscarObjetoRelacionado
  );
  if (motivoObjetoRemovido) {
    return motivoObjetoRemovido;
  }

  switch (historico.entidade) {
    case 'transacao':
      return obterMotivoBloqueioTransacao(historico);
    case 'salario':
      return obterMotivoBloqueioSalario(historico);
    case 'conta':
      return obterMotivoBloqueioConta(historico);
    case 'carteira':
      return obterMotivoBloqueioCarteira(historico);
    default:
      return null;
  }
}

async function contaExisteParaUsuario(contaId, usuarioId) {
  if (!contaId) {
    return false;
  }

  const contaExiste = await Conta.exists({
    _id: contaId,
    usuario: usuarioId,
  });

  return Boolean(contaExiste);
}

async function obterStatusDesfazer(historico, buscarObjetoRelacionado) {
  if (!historico || historico.desfeito) {
    return {
      desfazerDisponivel: false,
      motivoBloqueioDesfazer: null,
    };
  }

  const motivoBloqueioDesfazer = await obterMotivoBloqueioDesfazer(
    historico,
    buscarObjetoRelacionado
  );

  return {
    desfazerDisponivel: !motivoBloqueioDesfazer,
    motivoBloqueioDesfazer,
  };
}

function obterDescricaoEntidadeRemovida(entidade) {
  return (
    {
      transacao: 'a transação foi removida',
      conta: 'a conta foi removida',
      carteira: 'a carteira foi removida',
      salario: 'o salário foi removido',
      listaDesejo: 'o desejo foi removido',
    }[entidade] || 'o item foi removido'
  );
}

function formatarMotivoBloqueioDesfazer(contexto, detalhe) {
  return `Não é possível desfazer ${contexto} porque ${detalhe}`;
}

function formatarMotivoContaRemovida(contexto, relacao) {
  return formatarMotivoBloqueioDesfazer(
    contexto,
    `a conta ${relacao} foi removida`
  );
}

module.exports = {
  obterMotivoBloqueioDesfazer,
  obterStatusDesfazer,
  obterMotivoBloqueioTransacao,
  obterMotivoBloqueioSalario,
  obterMotivoBloqueioConta,
  obterMotivoBloqueioCarteira,
  contaExisteParaUsuario,
  obterMotivoBloqueioPorObjetoRemovido,
  obterDescricaoEntidadeRemovida,
  formatarMotivoBloqueioDesfazer,
  formatarMotivoContaRemovida,
};
