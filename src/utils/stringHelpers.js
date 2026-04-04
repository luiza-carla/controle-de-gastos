// Conjuga a ação no gênero gramatical correto da entidade
function conjugarAcao(acao, entidade) {
  const generoPorEntidade = {
    transacao: 'feminino',
    conta: 'feminino',
    carteira: 'feminino',
    salario: 'masculino',
    listaDesejo: 'masculino',
  };

  const terminacao = generoPorEntidade[entidade] === 'feminino' ? 'a' : 'o';

  const conjugacoes = {
    criacao: `criad${terminacao}`,
    edicao: `editad${terminacao}`,
    delecao: `deletad${terminacao}`,
    transferencia: `transferid${terminacao}`,
    realizacao: `realizad${terminacao}`,
  };

  return conjugacoes[acao] || acao;
}

// Formata valor numérico como moeda brasileira
function formatarMoeda(valor) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(Number(valor || 0));
}

module.exports = {
  conjugarAcao,
  formatarMoeda,
};
