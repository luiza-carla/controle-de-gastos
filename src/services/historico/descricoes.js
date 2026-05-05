const { formatarMoeda } = require('../../utils/stringHelpers');
const { conjugarAcao } = require('../../utils/stringHelpers');

// Formata descrição para transação
function formatarDescricaoTransacao(acao, transacao) {
  const tipo = transacao.tipo === 'entrada' ? 'Entrada' : 'Saída';
  const valor = formatarMoeda(transacao.valor);

  switch (acao) {
    case 'criacao':
      return `${tipo} criada: ${transacao.titulo} (${valor})`;
    case 'edicao':
      return `${tipo} editada: ${transacao.titulo} (${valor})`;
    case 'delecao':
      return `${tipo} deletada: ${transacao.titulo} (${valor})`;
    default:
      return `Ação em ${transacao.titulo}`;
  }
}

// Formata descrição para conta
function formatarDescricaoConta(acao, conta) {
  switch (acao) {
    case 'criacao':
      return `Conta criada: ${conta.nome}`;
    case 'edicao':
      return `Conta editada: ${conta.nome}`;
    case 'delecao':
      return `Conta deletada: ${conta.nome}`;
    default:
      return `Ação em conta ${conta.nome}`;
  }
}

// Formata descrição de transferência entre contas
function formatarDescricaoTransferenciaConta(contaOrigem, contaDestino, valor) {
  return `Transferência entre contas: ${contaOrigem.nome} -> ${contaDestino.nome} (${formatarMoeda(valor)})`;
}

// Formata descrição de transferência entre carteira e conta
function formatarDescricaoTransferenciaCarteira(conta, valor, direcao) {
  if (direcao === 'carteira-para-conta') {
    return `Transferência carteira -> conta: ${conta.nome} (${formatarMoeda(valor)})`;
  }

  return `Transferência conta -> carteira: ${conta.nome} (${formatarMoeda(valor)})`;
}

// Formata descrição genérica
function formatarDescricao(acao, entidade) {
  const entidadeNome =
    {
      transacao: 'Transação',
      conta: 'Conta',
      carteira: 'Carteira',
      salario: 'Salário',
      listaDesejo: 'Desejo',
    }[entidade] || entidade;

  const acaoNome = conjugarAcao(acao, entidade);

  return `${entidadeNome} ${acaoNome}`;
}

module.exports = {
  formatarDescricaoTransacao,
  formatarDescricaoConta,
  formatarDescricaoTransferenciaConta,
  formatarDescricaoTransferenciaCarteira,
  formatarDescricao,
};
