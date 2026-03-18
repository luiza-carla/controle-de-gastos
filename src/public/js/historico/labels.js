export function traduzirEntidade(entidade) {
  const traducoes = {
    transacao: 'Transação',
    conta: 'Conta',
    carteira: 'Carteira',
    salario: 'Salário',
    listaDesejo: 'Lista de Desejo',
  };
  return traducoes[entidade] || entidade;
}

export function traduzirAcao(acao) {
  const traducoes = {
    criacao: 'Criação',
    edicao: 'Edição',
    delecao: 'Deleção',
    transferencia: 'Transferência',
    realizacao: 'Realização',
  };
  return traducoes[acao] || acao;
}
