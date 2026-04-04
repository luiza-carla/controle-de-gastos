function normalizarAcaoHistorico(acao) {
  const mapa = {
    criacao: 'criação',
    edicao: 'edição',
    delecao: 'deleção',
    transferencia: 'transferência',
    realizacao: 'realização',
  };

  return mapa[acao] || acao;
}

function normalizarEntidadeHistorico(entidade) {
  const mapa = {
    transacao: 'transação',
    conta: 'conta',
    carteira: 'carteira',
    salario: 'salário',
    listaDesejo: 'desejo',
  };

  return mapa[entidade] || entidade;
}

function formatarDescricaoHistoricoPadrao(acao, entidade) {
  const acaoLabel = normalizarAcaoHistorico(acao);
  const entidadeLabel = normalizarEntidadeHistorico(entidade);
  return `Fez ${acaoLabel} em ${entidadeLabel}`;
}

module.exports = {
  formatarDescricaoHistoricoPadrao,
};
