const Transacao = require('../../models/Transacao');
const categoriaHelpers = require('../../utils/categoriaHelpers');
const { transacao: popularTransacao } = require('../../utils/populateHelpers');
const {
  totaisTransacoes,
  somaSaidas,
  normalizarPeriodo,
} = require('../../utils/resumoHelpers');
const {
  criarFiltroTransacoes,
  formatarPeriodoResposta,
} = require('./periodoHelpers');
const {
  calcularDetalhesSaldoDoPeriodo,
  carregarSaldosAtuais,
} = require('./saldoHelpers');
const { montarDetalhesMovimentos } = require('./movimentoHelpers');

class ResumoService {
  // Gera resumo financeiro atual do usuário
  // retorna apenas as propriedades usadas na tela de resumo:
  //   - saldoAtual: soma de todas as contas e da carteira
  //   - entradas: total de entradas do mês
  //   - saidas: total de saídas do mês
  //   - saldoCalculado: saldoAtual + entradas - saidas
  async gerarResumo(usuarioId, periodoSelecionado = null) {
    const periodo = normalizarPeriodo(periodoSelecionado);

    const filtroTransacoes = criarFiltroTransacoes(usuarioId, periodo);

    const transacoesPeriodo = await popularTransacao(
      Transacao.find(filtroTransacoes)
    );
    const { entradas, saidas } = totaisTransacoes(transacoesPeriodo);
    const detalhesEntradas = montarDetalhesMovimentos(
      transacoesPeriodo,
      'entrada'
    );
    const detalhesSaidas = montarDetalhesMovimentos(transacoesPeriodo, 'saida');

    let saldoContas = 0;
    let saldoCarteira = 0;
    let saldoAtual = entradas - saidas;
    let detalhesSaldo = calcularDetalhesSaldoDoPeriodo(transacoesPeriodo);

    if (!periodo.filtroAtivo) {
      ({ saldoContas, saldoCarteira, saldoAtual, detalhesSaldo } =
        await carregarSaldosAtuais(usuarioId));
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
      periodo: formatarPeriodoResposta(periodo),
    };
  }

  // Gera projeção financeira considerando transações pendentes
  async gerarProjecao(usuarioId, periodoSelecionado = null) {
    const periodo = normalizarPeriodo(periodoSelecionado);

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
      const dataInicio = new Date(periodo.dataInicio);
      const dataFim = new Date(periodo.dataFim);

      filtroPendentes.data = [dataInicio, dataFim];
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
      periodo: formatarPeriodoResposta(periodo),
      // salariosPendentesLancamento: undefined, // disponível se necessário
    };
  }
}

module.exports = new ResumoService();
