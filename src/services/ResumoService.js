const mongoose = require('mongoose');
const Transacao = require('../models/Transacao');
const Conta = require('../models/Conta');
const Carteira = require('../models/Carteira');
const categoriaHelpers = require('../utils/categoriaHelpers');
const { transacao: popularTransacao } = require('../utils/populateHelpers');
const { obterInicioMes } = require('../utils/salarioHelpers');
const {
  somarCampo,
  totaisTransacoes,
  somaSaidas,
} = require('../utils/resumoHelpers');

class ResumoService {
  obterPeriodoResumo(periodo = null) {
    if (periodo?.dataInicio && periodo?.dataFim) {
      return {
        filtroAtivo: true,
        dataInicio: periodo.dataInicio,
        dataFim: periodo.dataFim,
      };
    }

    const hoje = new Date();

    return {
      filtroAtivo: false,
      dataInicio: obterInicioMes(hoje),
      dataFim: hoje,
    };
  }

  criarFiltroTransacoes(usuarioId, periodo, status = 'pago') {
    return {
      usuario: usuarioId,
      ativa: true,
      status,
      data: mongoose.trusted({
        $gte: periodo.dataInicio,
        $lte: periodo.dataFim,
      }),
    };
  }

  obterNomeOrigemSaldo(transacao) {
    if (transacao?.fonteSaldo === 'carteira') {
      return 'Carteira';
    }

    return transacao?.conta?.nome || 'Conta';
  }

  calcularDetalhesSaldoDoPeriodo(transacoes = []) {
    const totaisPorOrigem = new Map();

    transacoes.forEach((transacao) => {
      const nomeOrigem = this.obterNomeOrigemSaldo(transacao);
      const valorAtual = totaisPorOrigem.get(nomeOrigem) || 0;
      const valorTransacao = Number(transacao?.valor || 0);
      const valorLiquido =
        transacao?.tipo === 'entrada' ? valorTransacao : -valorTransacao;

      totaisPorOrigem.set(nomeOrigem, valorAtual + valorLiquido);
    });

    return Array.from(totaisPorOrigem.entries())
      .map(([nome, valor]) => ({ nome, valor }))
      .sort((a, b) => a.valor - b.valor);
  }

  montarDetalhesMovimentos(transacoes = [], tipo) {
    return transacoes
      .filter((transacao) => transacao.tipo === tipo)
      .map((transacao) => ({
        data: transacao.data,
        categoria: transacao.categoria ? transacao.categoria.nome : '',
        subcategoria: transacao.subcategoria ? transacao.subcategoria.nome : '',
        nome: transacao.titulo,
        valor: Number(transacao.valor || 0),
      }))
      .sort((a, b) => a.valor - b.valor);
  }

  formatarPeriodoResposta(periodo) {
    return {
      filtroAtivo: periodo.filtroAtivo,
      dataInicio: periodo.dataInicio,
      dataFim: periodo.dataFim,
    };
  }

  async carregarSaldosAtuais(usuarioId) {
    const contas = await Conta.find({ usuario: usuarioId });
    const carteira = await Carteira.findOne({ usuario: usuarioId });

    const saldoContas = somarCampo(contas, 'saldo');
    const saldoCarteira = carteira?.saldo || 0;
    const detalhesSaldo = contas.map((conta) => ({
      nome: conta.nome,
      valor: Number(conta.saldo || 0),
    }));

    if (carteira) {
      detalhesSaldo.push({
        nome: 'Carteira',
        valor: Number(carteira.saldo || 0),
      });
    }

    detalhesSaldo.sort((a, b) => a.valor - b.valor);

    return {
      saldoContas,
      saldoCarteira,
      saldoAtual: saldoContas + saldoCarteira,
      detalhesSaldo,
    };
  }

  // Gera resumo financeiro atual do usuário
  // retorna apenas as propriedades usadas na tela de resumo:
  //   - saldoAtual: soma de todas as contas e da carteira
  //   - entradas: total de entradas do mês
  //   - saidas: total de saídas do mês
  //   - saldoCalculado: saldoAtual + entradas - saidas
  async gerarResumo(usuarioId, periodoSelecionado = null) {
    const periodo = this.obterPeriodoResumo(periodoSelecionado);
    const filtroTransacoes = this.criarFiltroTransacoes(usuarioId, periodo);

    const transacoesPeriodo = await popularTransacao(
      Transacao.find(filtroTransacoes).setOptions({ sanitizeFilter: false })
    );

    const { entradas, saidas } = totaisTransacoes(transacoesPeriodo);
    const detalhesEntradas = this.montarDetalhesMovimentos(
      transacoesPeriodo,
      'entrada'
    );
    const detalhesSaidas = this.montarDetalhesMovimentos(
      transacoesPeriodo,
      'saida'
    );

    let saldoContas = 0;
    let saldoCarteira = 0;
    let saldoAtual = entradas - saidas;
    let detalhesSaldo = this.calcularDetalhesSaldoDoPeriodo(transacoesPeriodo);

    if (!periodo.filtroAtivo) {
      ({ saldoContas, saldoCarteira, saldoAtual, detalhesSaldo } =
        await this.carregarSaldosAtuais(usuarioId));
    }

    const saldoCalculado = saldoAtual;

    return {
      saldoAtual,
      entradas,
      saidas,
      saldoCalculado,
      saldoContas,
      saldoCarteira,
      detalhesSaldo,
      detalhesEntradas,
      detalhesSaidas,
      periodo: this.formatarPeriodoResposta(periodo),
    };
  }

  // Gera projeção financeira considerando transações pendentes
  async gerarProjecao(usuarioId, periodoSelecionado = null) {
    const periodo = this.obterPeriodoResumo(periodoSelecionado);

    // reutiliza o resumo para obter o saldo calculado do mês atual;
    // essa é a base usada na tela de resumo e deve ser exibida na projeção.
    const resumo = await this.gerarResumo(usuarioId, periodoSelecionado);
    const saldoAtual = resumo.saldoCalculado;

    const refs = await categoriaHelpers.buscarSalario();

    // Busca pendentes EXCLUINDO salários (salários têm tratamento separado)
    const { filtroExclusao: filtroPendentesSemSalario } =
      categoriaHelpers.obterFiltrosSalario(refs, usuarioId);

    const filtroPendentes = {
      ...filtroPendentesSemSalario,
      status: 'pendente',
      ativa: true,
    };

    if (periodo.filtroAtivo) {
      filtroPendentes.data = mongoose.trusted({
        $gte: periodo.dataInicio,
        $lte: periodo.dataFim,
      });
    }

    const pendentes = await Transacao.find(filtroPendentes).setOptions({
      sanitizeFilter: false,
    });
    const saidasPendentes = somaSaidas(pendentes);

    const saldoProjetado = saldoAtual - saidasPendentes;

    return {
      saldoAtual,
      saldoProjetado,
      saidasPendentes,
      saldoCarteira: resumo.saldoCarteira || 0,
      periodo: this.formatarPeriodoResposta(periodo),
      // salariosPendentesLancamento: undefined, // disponível se necessário
    };
  }
}

module.exports = new ResumoService();
