const Transacao = require('../models/Transacao');
const Conta = require('../models/Conta');
const Carteira = require('../models/Carteira');
const categoriaHelpers = require('../utils/categoriaHelpers');
const {
  somarCampo,
  totaisTransacoes,
  somaSaidas,
} = require('../utils/resumoHelpers');

class ResumoService {
  // Busca salários ativos do usuário com base na categoria de salário
  async buscarSalariosAtivos(usuarioId, categoriaSalario) {
    if (!categoriaSalario) return [];

    return Transacao.find({
      usuario: usuarioId,
      categoria: categoriaSalario._id,
      ativa: true,
    });
  }

  // Adiciona exclusão da categoria de salário ao filtro quando houver categoria
  adicionarExclusaoCategoriaSalario(filtro, categoriaSalario) {
    if (!categoriaSalario) return filtro;

    return {
      ...filtro,
      categoria: { $ne: categoriaSalario._id },
    };
  }

  // Calcula data de vencimento de salário no mês
  calcularDataVencimentoNoMes(transacaoSalario, referencia) {
    const ano = referencia.getFullYear();
    const mes = referencia.getMonth();
    const ultimoDiaDoMes = new Date(ano, mes + 1, 0).getDate();
    const diaRecebimento = transacaoSalario.diaRecebimento || 5;
    const diaVencimento = Math.min(diaRecebimento, ultimoDiaDoMes);

    return new Date(ano, mes, diaVencimento, 0, 0, 0, 0);
  }

  // Valida se salário está ativo na data de vencimento
  salarioEstaValidoNoVencimento(transacaoSalario) {
    // Transação de salário está ativa se ativa === true
    return transacaoSalario.ativa;
  }

  // Calcula total de salários que já venceram até hoje
  calcularSalariosDevidosAteHoje(transacoesSalario, hoje) {
    const salariosVencidos = transacoesSalario.filter((salario) => {
      const dataVencimento = this.calcularDataVencimentoNoMes(salario, hoje);
      const jaVenceuNoMes = dataVencimento <= hoje;
      const validoNoVencimento = this.salarioEstaValidoNoVencimento(salario);

      return jaVenceuNoMes && validoNoVencimento;
    });

    return somarCampo(salariosVencidos, 'valor');
  }

  // Calcula quanto dos salários já foi processado no mês atual
  calcularSalariosProcessadosNoMes(salarios, inicioMes) {
    const salariosProcessados = salarios.filter((s) => {
      const ultimoProc = s.dataUltimoProcessamento;
      return ultimoProc && new Date(ultimoProc) >= inicioMes;
    });

    return somarCampo(salariosProcessados, 'valor');
  }

  // Gera resumo financeiro atual do usuário
  // retorna apenas as propriedades usadas na tela de resumo:
  //   - saldoAtual: soma de todas as contas e da carteira
  //   - entradas: total de entradas do mês
  //   - saidas: total de saídas do mês
  //   - saldoCalculado: saldoAtual + entradas - saidas
  async gerarResumo(usuarioId) {
    const hoje = new Date();
    const inicioMes = new Date(
      hoje.getFullYear(),
      hoje.getMonth(),
      1,
      0,
      0,
      0,
      0
    );
    const fimMes = new Date(
      hoje.getFullYear(),
      hoje.getMonth() + 1,
      0,
      23,
      59,
      59,
      999
    );

    // somente precisamos das contas e da carteira para o resumo simplificado
    const contas = await Conta.find({ usuario: usuarioId });
    const carteira = await Carteira.findOne({
      usuario: usuarioId,
      ativa: true,
    });

    const saldoContas = somarCampo(contas, 'saldo');
    const saldoCarteira = carteira?.saldo || 0;

    // Saldo atual é a soma de todas as contas e da carteira
    const saldoAtual = saldoContas + saldoCarteira;

    // prepara detalhamento de saldos
    const detalhesSaldo = contas.map((c) => ({
      nome: c.nome,
      valor: Number(c.saldo || 0),
    }));
    if (carteira) {
      detalhesSaldo.push({
        nome: 'Carteira',
        valor: Number(carteira.saldo || 0),
      });
    }

    // Transações do mês (não faz distinção de categoria)
    const filtroTransacoes = {
      usuario: usuarioId,
      ativa: true,
      status: 'pago',
      data: {
        $gte: inicioMes,
        $lte: fimMes,
      },
    };

    // incluir nome da categoria para exibição
    const transacoesMes = await Transacao.find(filtroTransacoes).populate(
      'categoria',
      'nome'
    );

    // Entradas e saídas do mês
    const { entradas, saidas } = totaisTransacoes(transacoesMes);

    // detalhamento de entradas e saídas usando título da transação
    const detalhesEntradas = transacoesMes
      .filter((t) => t.tipo === 'entrada')
      .map((t) => ({
        data: t.data,
        categoria: t.categoria ? t.categoria.nome : '',
        nome: t.titulo,
        valor: Number(t.valor || 0),
      }));
    const detalhesSaidas = transacoesMes
      .filter((t) => t.tipo === 'saida')
      .map((t) => ({
        data: t.data,
        categoria: t.categoria ? t.categoria.nome : '',
        nome: t.titulo,
        valor: Number(t.valor || 0),
      }));

    // ordenar valores menores para maiores
    detalhesSaldo.sort((a, b) => a.valor - b.valor);
    detalhesEntradas.sort((a, b) => a.valor - b.valor);
    detalhesSaidas.sort((a, b) => a.valor - b.valor);

    // Saldo calculado = saldo atual + entradas - saídas
    const saldoCalculado = saldoAtual + entradas - saidas;

    return {
      saldoAtual,
      entradas,
      saidas,
      saldoCalculado,
      detalhesSaldo,
      detalhesEntradas,
      detalhesSaidas,
    };
  }

  // Gera projeção financeira considerando transações pendentes
  async gerarProjecao(usuarioId) {
    // reutiliza o resumo para obter o saldo calculado do mês atual;
    // essa é a base usada na tela de resumo e deve ser exibida na projeção.
    const resumo = await this.gerarResumo(usuarioId);
    const saldoAtual = resumo.saldoCalculado;

    const categoriaSalario = await categoriaHelpers.buscarSalario();

    // Busca pendentes EXCLUINDO salários (salários têm tratamento separado)
    const filtroPendentes = {
      usuario: usuarioId,
      ativa: true,
      status: 'pendente',
    };

    const filtroPendentesSemSalario = this.adicionarExclusaoCategoriaSalario(
      filtroPendentes,
      categoriaSalario
    );

    const pendentes = await Transacao.find(filtroPendentesSemSalario);
    const saidasPendentes = somaSaidas(pendentes);

    const saldoProjetado = saldoAtual - saidasPendentes;

    return {
      saldoAtual,
      saldoProjetado,
      saidasPendentes,
      saldoCarteira: resumo.saldoCarteira || 0,
      // salariosPendentesLancamento: undefined, // disponível se necessário
    };
  }
}

module.exports = new ResumoService();
