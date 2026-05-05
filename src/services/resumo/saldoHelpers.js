const Conta = require('../../models/Conta');
const Carteira = require('../../models/Carteira');
const { somarCampo } = require('../../utils/resumoHelpers');

// Retorna o nome da origem do saldo da transação
// Se for carteira, retorna fixo; senão, usa o nome da conta
function obterNomeOrigemSaldo(transacao) {
  if (transacao?.fonteSaldo === 'carteira') {
    return 'Carteira';
  }

  return transacao?.conta?.nome || 'Conta';
}

// Calcula o saldo líquido do período agrupado por origem (conta/carteira)
// Entradas somam, saídas subtraem
function calcularDetalhesSaldoDoPeriodo(transacoes = []) {
  const totaisPorOrigem = new Map();

  transacoes.forEach((transacao) => {
    const nomeOrigem = obterNomeOrigemSaldo(transacao);

    // pega valor acumulado atual da origem (ou 0 se não existir)
    const valorAtual = totaisPorOrigem.get(nomeOrigem) || 0;
    const valorTransacao = Number(transacao?.valor || 0);
    // define se soma ou subtrai baseado no tipo da transação
    const valorLiquido =
      transacao?.tipo === 'entrada' ? valorTransacao : -valorTransacao;

    // atualiza o total daquela origem
    totaisPorOrigem.set(nomeOrigem, valorAtual + valorLiquido);
  });

  // transforma Map em array de objetos e ordena por valor
  return Array.from(totaisPorOrigem.entries())
    .map(([nome, valor]) => ({ nome, valor }))
    .sort((a, b) => a.valor - b.valor);
}

// Carrega os saldos atuais do usuário (contas + carteira)
async function carregarSaldosAtuais(usuarioId) {
  const contas = await Conta.find({ usuario: usuarioId });
  const carteira = await Carteira.findOne({ usuario: usuarioId });

  const saldoContas = somarCampo(contas, 'saldo');
  const saldoCarteira = carteira?.saldo || 0;
  // cria lista detalhada das contas
  const detalhesSaldo = contas.map((conta) => ({
    nome: conta.nome,
    valor: Number(conta.saldo || 0),
  }));

  // adiciona carteira como mais uma origem no detalhamento
  if (carteira) {
    detalhesSaldo.push({
      nome: 'Carteira',
      valor: Number(carteira.saldo || 0),
    });
  }
  // ordena do menor para o maior saldo
  detalhesSaldo.sort((a, b) => a.valor - b.valor);

  return {
    saldoContas,
    saldoCarteira,
    saldoAtual: saldoContas + saldoCarteira,
    detalhesSaldo,
  };
}

module.exports = {
  obterNomeOrigemSaldo,
  calcularDetalhesSaldoDoPeriodo,
  carregarSaldosAtuais,
};
