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

    const categoriaSalario = await categoriaHelpers.buscarSalario();
    const salarios = await this.buscarSalariosAtivos(
      usuarioId,
      categoriaSalario
    );

    const contas = await Conta.find({ usuario: usuarioId });
    const carteira = await Carteira.findOne({
      usuario: usuarioId,
      ativa: true,
    });

    // Busca transações do mês EXCLUINDO salários (para não duplicar)
    const filtroTransacoes = {
      usuario: usuarioId,
      ativa: true,
      status: 'pago',
      data: {
        $gte: inicioMes,
        $lte: fimMes,
      },
    };

    const filtroTransacoesSemSalario = this.adicionarExclusaoCategoriaSalario(
      filtroTransacoes,
      categoriaSalario
    );

    const transacoesMes = await Transacao.find(filtroTransacoesSemSalario);

    // Calcula salários devidos até hoje
    const salariosDevidosAteHoje = this.calcularSalariosDevidosAteHoje(
      salarios,
      hoje
    );

    // Calcula quanto dos salários devidos já foi processado neste mês
    const salariosProcessadosNoMes = this.calcularSalariosProcessadosNoMes(
      salarios,
      inicioMes
    );

    const salariosPendentesLancamento = Math.max(
      0,
      salariosDevidosAteHoje - salariosProcessadosNoMes
    );
    const saldoContas = somarCampo(contas, 'saldo');
    const saldoCarteira = carteira?.saldo || 0;

    // Calcula entradas e saídas do mês (SEM incluir salários)
    const { entradas, saidas } = totaisTransacoes(transacoesMes);

    // Saldo = contas + carteira + salários pendentes de processamento
    const saldo = saldoContas + saldoCarteira + salariosPendentesLancamento;

    return {
      saldo,
      salarios: salariosDevidosAteHoje,
      saldoContas,
      saldoCarteira,
      entradas,
      saidas,
    };
  }

  // Gera projeção financeira considerando transações pendentes
  async gerarProjecao(usuarioId) {
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

    const categoriaSalario = await categoriaHelpers.buscarSalario();
    const salarios = await this.buscarSalariosAtivos(
      usuarioId,
      categoriaSalario
    );

    const contas = await Conta.find({ usuario: usuarioId });
    const carteira = await Carteira.findOne({
      usuario: usuarioId,
      ativa: true,
    });

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

    const salariosDevidosAteHoje = this.calcularSalariosDevidosAteHoje(
      salarios,
      hoje
    );

    // Calcula quanto dos salários devidos já foi processado neste mês
    const salariosProcessadosNoMes = this.calcularSalariosProcessadosNoMes(
      salarios,
      inicioMes
    );

    const salariosPendentesLancamento = Math.max(
      0,
      salariosDevidosAteHoje - salariosProcessadosNoMes
    );

    const saldoContas = somarCampo(contas, 'saldo');
    const saldoCarteira = carteira?.saldo || 0;
    const saidasPendentes = somaSaidas(pendentes);

    // O saldo atual inclui contas + carteira + salários pendentes
    const saldoAtual =
      saldoContas + saldoCarteira + salariosPendentesLancamento;
    const saldoProjetado = saldoAtual - saidasPendentes;

    return {
      saldoAtual,
      saldoProjetado,
      saldoCarteira,
      saidasPendentes,
    };
  }
}

module.exports = new ResumoService();
