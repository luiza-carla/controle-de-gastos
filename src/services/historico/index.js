const Historico = require('../../models/Historico');
const Transacao = require('../../models/Transacao');
const Conta = require('../../models/Conta');
const Carteira = require('../../models/Carteira');
const ListaDesejo = require('../../models/ListaDesejo');
const { criarErro, fallbackComErro } = require('../../utils/errorHelpers');
const {
  formatarDescricaoHistoricoPadrao,
} = require('../../utils/historicoDescricao');
const {
  criarResolvedorHistoricoPorOperacao,
} = require('./resolvedorHistorico');
const bloqueios = require('./bloqueios');
const reversao = require('./reversao');
const saldos = require('./saldos');
const limpeza = require('./limpeza');
const descricoes = require('./descricoes');

// helpers de population reutilizados entre módulos
const { transacao: populateTransacao } = require('../../utils/populateHelpers');

class HistoricoService {
  static _anexarDescricaoEObjeto(
    historico,
    objeto = null,
    statusDesfazer = {}
  ) {
    return {
      ...historico,
      descricao: formatarDescricaoHistoricoPadrao(
        historico.acao,
        historico.entidade
      ),
      objeto,
      desfazerDisponivel:
        statusDesfazer.desfazerDisponivel !== false && !historico.desfeito,
      motivoBloqueioDesfazer: statusDesfazer.motivoBloqueioDesfazer || null,
    };
  }

  // Extrai metadados úteis da requisição
  static extrairMetadata(req) {
    if (!req) return {};

    return {
      ip: req.ip,
      userAgent: req.get('user-agent'),
    };
  }

  // Registra uma ação no histórico
  static async registrar(dados) {
    try {
      const descricao = formatarDescricaoHistoricoPadrao(
        dados.acao,
        dados.entidade
      );

      const historico = new Historico({
        usuario: dados.usuario,
        entidade: dados.entidade,
        entidadeId: dados.entidadeId,
        acao: dados.acao,
        descricao,
        dadosAnteriores: dados.dadosAnteriores || null,
        dadosNovos: dados.dadosNovos || null,
        metadata: dados.metadata || {},
      });

      await historico.save();
      return historico;
    } catch (error) {
      // Não lançamos erro para não interromper a operação principal
      return fallbackComErro(error, 'Erro ao registrar histórico', null);
    }
  }

  // Busca o objeto relacionado ao histórico
  static async _buscarObjetoRelacionado(
    entidade,
    entidadeId,
    usuarioId = null
  ) {
    if (!entidadeId) {
      return null;
    }

    try {
      const filtroPorUsuario = usuarioId ? { usuario: usuarioId } : {};

      if (entidade === 'transacao' || entidade === 'salario') {
        return await populateTransacao(
          Transacao.findOne({ _id: entidadeId, ...filtroPorUsuario })
        ).lean();
      }

      switch (entidade) {
        case 'conta':
          return await Conta.findOne({
            _id: entidadeId,
            ...filtroPorUsuario,
          }).lean();
        case 'carteira':
          return await Carteira.findOne({
            _id: entidadeId,
            ...filtroPorUsuario,
          }).lean();
        case 'listaDesejo':
          return await ListaDesejo.findOne({
            _id: entidadeId,
            ...filtroPorUsuario,
          })
            .populate('categoria', 'nome cor tipo')
            .populate('subcategoria', 'nome')
            .lean();
        default:
          return null;
      }
    } catch (error) {
      return fallbackComErro(
        error,
        `Erro ao buscar objeto relacionado (${entidade}/${entidadeId})`,
        null
      );
    }
  }

  // Busca histórico do usuário
  static async buscarPorUsuario(usuarioId, filtros = {}) {
    const query = { usuario: usuarioId };

    if (filtros.entidade) {
      query.entidade = filtros.entidade;
    }

    if (filtros.entidadeId) {
      query.entidadeId = filtros.entidadeId;
    }

    if (filtros.acao) {
      query.acao = filtros.acao;
    }

    if (filtros.desfeito !== undefined && filtros.desfeito !== '') {
      query.desfeito = filtros.desfeito === 'true' || filtros.desfeito === true;
    }

    const limit = filtros.limit || 50;
    const skip = filtros.skip || 0;

    const ordenarPor = filtros.ordenarPor || filtros.sortBy;
    const sort = ordenarPor === 'nome' ? { descricao: 1 } : { createdAt: -1 };

    const historicos = await Historico.find(query)
      .sort(sort)
      .limit(limit)
      .skip(skip)
      .lean();

    const { popularIds, obterObjetoRelacionado } =
      criarResolvedorHistoricoPorOperacao((entidade, entidadeId) =>
        this._buscarObjetoRelacionado(entidade, entidadeId)
      );

    const historicosComObjetos = await Promise.all(
      historicos.map(async (historico) => {
        if (historico.dadosNovos) {
          await popularIds(historico.dadosNovos);
        }
        if (historico.dadosAnteriores) {
          await popularIds(historico.dadosAnteriores);
        }

        const statusDesfazer = await bloqueios.obterStatusDesfazer(
          historico,
          (entidade, id) =>
            this._buscarObjetoRelacionado(entidade, id, historico.usuario)
        );

        return this._anexarDescricaoEObjeto(
          historico,
          await obterObjetoRelacionado(historico),
          statusDesfazer
        );
      })
    );

    const total = await Historico.countDocuments(query);

    return {
      historicos: historicosComObjetos,
      total,
      limit,
      skip,
    };
  }

  // Busca histórico de uma entidade específica
  static async buscarPorEntidade(entidade, entidadeId, usuarioId) {
    const historicos = await Historico.find({
      entidade,
      entidadeId,
      usuario: usuarioId,
    })
      .sort({ createdAt: -1 })
      .lean();

    // Busca o objeto relacionado uma única vez
    const objeto = await this._buscarObjetoRelacionado(
      entidade,
      entidadeId,
      usuarioId
    );

    return Promise.all(
      historicos.map(async (historico) => {
        const statusDesfazer = await bloqueios.obterStatusDesfazer(
          historico,
          (entidade, id) =>
            this._buscarObjetoRelacionado(entidade, id, historico.usuario)
        );

        return this._anexarDescricaoEObjeto(historico, objeto, statusDesfazer);
      })
    );
  }

  // Desfaz uma ação do histórico
  static async desfazer(historicoId, usuarioId) {
    // Busca o registro de histórico
    const historico = await Historico.findOne({
      _id: historicoId,
      usuario: usuarioId,
    });

    if (!historico) {
      throw criarErro(404, 'Registro de histórico não encontrado');
    }

    if (historico.desfeito) {
      throw criarErro(409, 'Esta ação já foi desfeita');
    }

    const motivoBloqueioDesfazer = await bloqueios.obterMotivoBloqueioDesfazer(
      historico,
      (entidade, id) =>
        this._buscarObjetoRelacionado(entidade, id, historico.usuario)
    );

    if (motivoBloqueioDesfazer) {
      throw criarErro(400, motivoBloqueioDesfazer);
    }

    // Reverte a ação; erros sobem para o middleware global de erro
    await reversao.reverterAcao(historico);

    if (historico.entidade === 'transacao') {
      await saldos.ajustarSaldoAoReverterTransacao(
        historico.acao,
        usuarioId,
        historico.dadosAnteriores,
        historico.dadosNovos
      );
    }

    // Marca como desfeito
    historico.desfeito = true;
    historico.desfeitoEm = new Date();
    await historico.save();

    return { success: true, message: 'Ação desfeita com sucesso!' };
  }

  static formatarDescricaoConta = descricoes.formatarDescricaoConta;
  static formatarDescricaoTransferenciaConta =
    descricoes.formatarDescricaoTransferenciaConta;
  static formatarDescricaoTransferenciaCarteira =
    descricoes.formatarDescricaoTransferenciaCarteira;
  static calcularDiasRestantesParaLimpeza =
    limpeza.calcularDiasRestantesParaLimpeza;
  static limparPorCiclo = limpeza.limparPorCiclo;
  static formatarDescricaoTransacao = descricoes.formatarDescricaoTransacao;
}

module.exports = HistoricoService;
