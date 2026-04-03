const Historico = require('../models/Historico');
const Usuario = require('../models/Usuario');
const logger = require('../utils/logger');
const mongoose = require('mongoose');
const Transacao = require('../models/Transacao');
const Conta = require('../models/Conta');
const Carteira = require('../models/Carteira');
const ListaDesejo = require('../models/ListaDesejo');
const { conjugarAcao, formatarMoeda } = require('../utils/stringHelpers');
const { criarErro, fallbackComErro } = require('../utils/errorHelpers');
const {
  salarioJaProcessadoNoMes,
  extrairDestinoSaldo,
  extrairContaId,
} = require('../utils/salarioHelpers');
const {
  formatarDescricaoHistoricoPadrao,
} = require('../utils/historicoDescricao');

const FONTE_DADOS_PRIORITARIA_POR_ACAO = {
  criacao: 'dadosNovos',
  edicao: 'dadosNovos',
  delecao: 'dadosAnteriores',
};

// helpers de population reutilizados entre módulos
const { transacao: populateTransacao } = require('../utils/populateHelpers');

function criarResolvedorHistoricoPorOperacao(buscarObjetoRelacionado) {
  const cacheObjetos = new Map();
  const cacheCategorias = new Map();
  const cacheSubcategorias = new Map();

  const isObjectIdString = (value) =>
    typeof value === 'string' && /^[a-fA-F0-9]{24}$/.test(value);

  function obterChaveCache(valor) {
    return valor && valor.toString ? valor.toString() : String(valor);
  }

  async function carregarCategoria(categoriaId) {
    const chaveCache = obterChaveCache(categoriaId);

    if (!cacheCategorias.has(chaveCache)) {
      const Categoria = require('../models/Categoria');
      cacheCategorias.set(
        chaveCache,
        Categoria.findById(categoriaId)
          .select('nome cor tipo')
          .catch(() => null)
      );
    }

    return cacheCategorias.get(chaveCache);
  }

  async function carregarSubcategoria(subcategoriaId) {
    const chaveCache = obterChaveCache(subcategoriaId);

    if (!cacheSubcategorias.has(chaveCache)) {
      const Subcategoria = require('../models/Subcategoria');
      cacheSubcategorias.set(
        chaveCache,
        Subcategoria.findById(subcategoriaId)
          .select('nome')
          .catch(() => null)
      );
    }

    return cacheSubcategorias.get(chaveCache);
  }

  async function popularIds(obj) {
    if (!obj || typeof obj !== 'object') return obj;

    const categoriaPopulada =
      obj.categoria && typeof obj.categoria === 'object' && obj.categoria.nome;
    const categoriaEhId =
      obj.categoria &&
      (isObjectIdString(obj.categoria) || obj.categoria.toString);

    if (obj.categoria && !categoriaPopulada && categoriaEhId) {
      const categoria = await carregarCategoria(obj.categoria);
      if (categoria) obj.categoria = categoria;
    }

    const subcategoriaPopulada =
      obj.subcategoria &&
      typeof obj.subcategoria === 'object' &&
      obj.subcategoria.nome;
    const subcategoriaEhId =
      obj.subcategoria &&
      (isObjectIdString(obj.subcategoria) || obj.subcategoria.toString);

    if (obj.subcategoria && !subcategoriaPopulada && subcategoriaEhId) {
      const subcategoria = await carregarSubcategoria(obj.subcategoria);
      if (subcategoria) obj.subcategoria = subcategoria;
    }

    return obj;
  }

  async function obterObjetoRelacionado(historico) {
    const chaveCache = `${historico.entidade}:${historico.entidadeId}`;

    if (!cacheObjetos.has(chaveCache)) {
      cacheObjetos.set(
        chaveCache,
        (async () => {
          let objetoRelacionado;
          let snapshotObj = null;

          const fontePrioritaria =
            FONTE_DADOS_PRIORITARIA_POR_ACAO[historico.acao];
          if (
            fontePrioritaria &&
            historico[fontePrioritaria] &&
            Object.keys(historico[fontePrioritaria]).length
          ) {
            snapshotObj = { ...historico[fontePrioritaria] };
          }

          if (
            historico.acao === 'delecao' &&
            historico.dadosAnteriores &&
            Object.keys(historico.dadosAnteriores).length
          ) {
            objetoRelacionado = { ...historico.dadosAnteriores };
          } else if (snapshotObj) {
            objetoRelacionado = snapshotObj;
          } else {
            objetoRelacionado = await buscarObjetoRelacionado(
              historico.entidade,
              historico.entidadeId
            );
          }

          return popularIds(objetoRelacionado);
        })()
      );
    }

    return cacheObjetos.get(chaveCache);
  }

  return {
    obterObjetoRelacionado,
    popularIds,
  };
}

class HistoricoService {
  static _obterDescricaoEntidadeRemovida(entidade) {
    return (
      {
        transacao: 'a transação foi removida',
        conta: 'a conta foi removida',
        carteira: 'a carteira foi removida',
        salario: 'o salário foi removido',
        listaDesejo: 'o item da lista de desejos foi removido',
      }[entidade] || 'o item foi removido'
    );
  }

  static _formatarMotivoBloqueioDesfazer(contexto, detalhe) {
    return `Não é possível desfazer ${contexto} porque ${detalhe}`;
  }

  static _formatarMotivoContaRemovida(contexto, relacao) {
    return this._formatarMotivoBloqueioDesfazer(
      contexto,
      `a conta ${relacao} foi removida`
    );
  }

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

  static async _contaExisteParaUsuario(contaId, usuarioId) {
    if (!contaId) {
      return false;
    }

    const contaExiste = await Conta.exists({
      _id: contaId,
      usuario: usuarioId,
    });

    return Boolean(contaExiste);
  }

  static async _obterMotivoBloqueioPorObjetoRemovido(historico) {
    if (!['criacao', 'edicao'].includes(historico.acao)) {
      return null;
    }

    const objetoRelacionado = await this._buscarObjetoRelacionado(
      historico.entidade,
      historico.entidadeId,
      historico.usuario
    );

    if (objetoRelacionado) {
      return null;
    }

    return this._formatarMotivoBloqueioDesfazer(
      'esta ação',
      this._obterDescricaoEntidadeRemovida(historico.entidade)
    );
  }

  static async _obterMotivoBloqueioTransacao(historico) {
    if (!['delecao', 'edicao'].includes(historico.acao)) {
      return null;
    }

    const snapshotTransacao = this._normalizarSnapshotTransacao(
      historico.dadosAnteriores
    );
    const destino = extrairDestinoSaldo(snapshotTransacao);

    if (destino.tipo !== 'conta' || !destino.contaId) {
      return null;
    }

    const contaExiste = await this._contaExisteParaUsuario(
      destino.contaId,
      historico.usuario
    );

    if (contaExiste) {
      return null;
    }

    return this._formatarMotivoContaRemovida('transação', 'associada');
  }

  static async _obterMotivoBloqueioSalario(historico) {
    if (!['delecao', 'edicao'].includes(historico.acao)) {
      return null;
    }

    const destino = extrairDestinoSaldo(historico.dadosAnteriores);
    if (destino.tipo !== 'conta' || !destino.contaId) {
      return null;
    }

    const contaExiste = await this._contaExisteParaUsuario(
      destino.contaId,
      historico.usuario
    );

    if (contaExiste) {
      return null;
    }

    if (historico.acao === 'edicao') {
      return this._formatarMotivoContaRemovida(
        'edição do salário',
        'de destino'
      );
    }

    return this._formatarMotivoContaRemovida(
      'exclusão do salário',
      'de destino'
    );
  }

  static async _obterMotivoBloqueioConta(historico) {
    if (historico.acao !== 'transferencia') {
      return null;
    }

    const { contaOrigemId, contaDestinoId } = historico.dadosAnteriores || {};

    const [origemExiste, destinoExiste] = await Promise.all([
      this._contaExisteParaUsuario(contaOrigemId, historico.usuario),
      this._contaExisteParaUsuario(contaDestinoId, historico.usuario),
    ]);

    if (!origemExiste && !destinoExiste) {
      return this._formatarMotivoBloqueioDesfazer(
        'transferência entre contas',
        'as contas de origem e destino foram removidas'
      );
    }

    if (!origemExiste) {
      return this._formatarMotivoContaRemovida(
        'transferência entre contas',
        'de origem'
      );
    }

    if (!destinoExiste) {
      return this._formatarMotivoContaRemovida(
        'transferência entre contas',
        'de destino'
      );
    }

    return null;
  }

  static async _obterMotivoBloqueioCarteira(historico) {
    if (historico.acao !== 'transferencia') {
      return null;
    }

    const contaId = historico.dadosAnteriores?.contaId;
    if (!contaId) {
      return null;
    }

    const contaExiste = await this._contaExisteParaUsuario(
      contaId,
      historico.usuario
    );

    if (contaExiste) {
      return null;
    }

    return this._formatarMotivoContaRemovida(
      'transferência da carteira',
      'associada'
    );
  }

  static async _obterMotivoBloqueioDesfazer(historico) {
    if (!historico || historico.desfeito) {
      return null;
    }

    const motivoObjetoRemovido =
      await this._obterMotivoBloqueioPorObjetoRemovido(historico);
    if (motivoObjetoRemovido) {
      return motivoObjetoRemovido;
    }

    switch (historico.entidade) {
      case 'transacao':
        return this._obterMotivoBloqueioTransacao(historico);
      case 'salario':
        return this._obterMotivoBloqueioSalario(historico);
      case 'conta':
        return this._obterMotivoBloqueioConta(historico);
      case 'carteira':
        return this._obterMotivoBloqueioCarteira(historico);
      default:
        return null;
    }
  }

  static async _obterStatusDesfazer(historico) {
    if (!historico || historico.desfeito) {
      return {
        desfazerDisponivel: false,
        motivoBloqueioDesfazer: null,
      };
    }

    const motivoBloqueioDesfazer =
      await this._obterMotivoBloqueioDesfazer(historico);

    return {
      desfazerDisponivel: !motivoBloqueioDesfazer,
      motivoBloqueioDesfazer,
    };
  }

  static _garantirDadosAnteriores(dadosAnteriores) {
    if (!dadosAnteriores) {
      throw criarErro(400, 'Dados anteriores não disponíveis');
    }
  }

  static _normalizarObjectIdSnapshot(referencia) {
    if (!referencia) {
      return referencia || null;
    }

    const idExtraido = extrairContaId(referencia);
    if (idExtraido) {
      return idExtraido;
    }

    if (typeof referencia === 'string') {
      return referencia;
    }

    if (
      typeof referencia === 'object' &&
      Object.getPrototypeOf(referencia) === Object.prototype
    ) {
      if (
        Object.prototype.hasOwnProperty.call(referencia, '_id') &&
        referencia._id != null
      ) {
        return this._normalizarObjectIdSnapshot(referencia._id);
      }

      if (
        Object.prototype.hasOwnProperty.call(referencia, 'id') &&
        referencia.id != null
      ) {
        return this._normalizarObjectIdSnapshot(referencia.id);
      }
    }

    if (typeof referencia?.toString === 'function') {
      const valor = referencia.toString();
      const id = extrairContaId(valor);
      return id || valor;
    }

    return referencia;
  }

  static _normalizarSnapshotTransacao(snapshot) {
    if (!snapshot || typeof snapshot !== 'object') {
      return snapshot;
    }

    return {
      ...snapshot,
      _id: this._normalizarObjectIdSnapshot(snapshot._id),
      usuario: this._normalizarObjectIdSnapshot(snapshot.usuario),
      conta: this._normalizarObjectIdSnapshot(snapshot.conta),
      categoria: this._normalizarObjectIdSnapshot(snapshot.categoria),
      subcategoria: this._normalizarObjectIdSnapshot(snapshot.subcategoria),
    };
  }

  static async _reverterCrudBasico(Model, acao, entidadeId, dadosAnteriores) {
    switch (acao) {
      case 'criacao':
        await Model.findByIdAndDelete(entidadeId);
        break;
      case 'edicao':
        this._garantirDadosAnteriores(dadosAnteriores);
        await Model.findByIdAndUpdate(entidadeId, dadosAnteriores);
        break;
      case 'delecao':
        this._garantirDadosAnteriores(dadosAnteriores);
        await Model.create(dadosAnteriores);
        break;
      default:
        break;
    }
  }

  static async _restaurarSaldoConta(usuarioId, contaId, saldo) {
    await Conta.updateOne(
      { _id: contaId, usuario: usuarioId },
      { $set: { saldo } }
    );
  }

  static async _ajustarSaldoCarteira(usuarioId, delta) {
    await Carteira.updateOne(
      { usuario: usuarioId },
      { $inc: { saldo: delta } }
    );
  }

  static async _ajustarSaldoConta(usuarioId, contaId, delta) {
    await Conta.updateOne(
      { _id: contaId, usuario: usuarioId },
      { $inc: { saldo: delta } }
    );
  }

  static async _restaurarSaldoCarteira(usuarioId, saldo) {
    await Carteira.updateOne({ usuario: usuarioId }, { $set: { saldo } });
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

        const statusDesfazer = await this._obterStatusDesfazer(historico);

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
        const statusDesfazer = await this._obterStatusDesfazer(historico);

        return this._anexarDescricaoEObjeto(historico, objeto, statusDesfazer);
      })
    );
  }

  // Limpa histórico a cada X dias desde a última limpeza (ou criação da conta).
  static async calcularDiasRestantesParaLimpeza(diasCiclo = 30) {
    const agora = new Date();

    const usuarios = await Usuario.find(
      {},
      {
        createdAt: 1,
        ultimaLimpezaHistorico: 1,
        primeiraLimpezaHistorico: 1,
      }
    ).lean();

    if (!usuarios.length) {
      return { countElegiveis: 0, minDiasRestantes: null };
    }

    let countElegiveis = 0;
    let minDiasRestantes = Infinity;

    const msPorDia = 1000 * 60 * 60 * 24;

    for (const usuario of usuarios) {
      let referencia;
      if (usuario.primeiraLimpezaHistorico !== false) {
        // Primeiro ciclo: referência é a criação da conta.
        referencia = usuario.createdAt;
      } else {
        // Limpeza subsequente: referência é a última limpeza.
        referencia = usuario.ultimaLimpezaHistorico;
      }

      if (!referencia) continue;

      const diasPassados = Math.floor(
        (agora - new Date(referencia)) / msPorDia
      );
      const diasRestantes = diasCiclo - diasPassados;

      if (diasRestantes <= 0) {
        countElegiveis += 1;
      } else {
        minDiasRestantes = Math.min(minDiasRestantes, diasRestantes);
      }
    }

    return {
      countElegiveis,
      minDiasRestantes: minDiasRestantes === Infinity ? null : minDiasRestantes,
    };
  }

  static async limparPorCiclo(diasCiclo = 30, diasRetencao = 0) {
    if (diasCiclo <= 0 || diasRetencao < 0) {
      throw criarErro(
        400,
        'Dias de ciclo e retenção devem ser números positivos'
      );
    }

    const hoje = new Date();
    const dataLimiteCiclo = new Date();
    dataLimiteCiclo.setDate(dataLimiteCiclo.getDate() - diasCiclo);

    // Busca usuários que precisam de limpeza:
    // - primeiraLimpezaHistorico (ou ausente) e conta com mais de X dias, OU
    // - limpeza normal (primeiraLimpezaHistorico false) e passou X dias desde a última limpeza.
    const usuariosPrimeira = await Usuario.find(
      {
        primeiraLimpezaHistorico: mongoose.trusted({ $ne: false }),
        createdAt: mongoose.trusted({ $lte: dataLimiteCiclo }),
      },
      { _id: 1 },
      { sanitizeFilter: false }
    ).lean();

    const usuariosCiclo = await Usuario.find(
      {
        primeiraLimpezaHistorico: false,
        ultimaLimpezaHistorico: mongoose.trusted({ $lte: dataLimiteCiclo }),
      },
      { _id: 1 },
      { sanitizeFilter: false }
    ).lean();

    const usuariosPrimeiraLimpezaIds = usuariosPrimeira.map((u) => u._id);
    const usuariosCicloIds = usuariosCiclo.map((u) => u._id);

    if (!usuariosPrimeiraLimpezaIds.length && !usuariosCicloIds.length) {
      return 0;
    }

    let totalRemovidos = 0;

    // Para a primeira limpeza do usuário: remove TODO o histórico dele.
    if (usuariosPrimeiraLimpezaIds.length) {
      const resultado = await Historico.deleteMany(
        { usuario: mongoose.trusted({ $in: usuariosPrimeiraLimpezaIds }) },
        { sanitizeFilter: false }
      );
      totalRemovidos += resultado.deletedCount;

      await Usuario.updateMany(
        { _id: mongoose.trusted({ $in: usuariosPrimeiraLimpezaIds }) },
        {
          $set: {
            primeiraLimpezaHistorico: false,
            ultimaLimpezaHistorico: hoje,
          },
        },
        { sanitizeFilter: false }
      );
    }

    // Para limpezas de ciclo subsequentes: respeita retenção (se configurada).
    if (usuariosCicloIds.length) {
      const filtro = {
        usuario: mongoose.trusted({ $in: usuariosCicloIds }),
      };
      if (diasRetencao > 0) {
        const dataLimiteRetencao = new Date();
        dataLimiteRetencao.setDate(dataLimiteRetencao.getDate() - diasRetencao);
        filtro.createdAt = mongoose.trusted({ $lt: dataLimiteRetencao });
      }

      const resultado = await Historico.deleteMany(filtro, {
        sanitizeFilter: false,
      });
      totalRemovidos += resultado.deletedCount;

      await Usuario.updateMany(
        { _id: mongoose.trusted({ $in: usuariosCicloIds }) },
        { $set: { ultimaLimpezaHistorico: hoje } },
        { sanitizeFilter: false }
      );
    }

    const totalUsuarios =
      usuariosPrimeiraLimpezaIds.length + usuariosCicloIds.length;
    logger.info(
      `Limpeza concluida: ${totalRemovidos} registro(s) removido(s) em ${totalUsuarios} usuário(s) (primeira: ${usuariosPrimeiraLimpezaIds.length}, ciclo: ${usuariosCicloIds.length})`,
      'HistoricoCleanup'
    );

    return totalRemovidos;
  }

  // Formata descrição para transação
  static formatarDescricaoTransacao(acao, transacao) {
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
  static formatarDescricaoConta(acao, conta) {
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
  static formatarDescricaoTransferenciaConta(contaOrigem, contaDestino, valor) {
    return `Transferência entre contas: ${contaOrigem.nome} -> ${contaDestino.nome} (${formatarMoeda(valor)})`;
  }

  // Formata descrição de transferência entre carteira e conta
  static formatarDescricaoTransferenciaCarteira(conta, valor, direcao) {
    if (direcao === 'carteira-para-conta') {
      return `Transferência carteira -> conta: ${conta.nome} (${formatarMoeda(valor)})`;
    }

    return `Transferência conta -> carteira: ${conta.nome} (${formatarMoeda(valor)})`;
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

    const motivoBloqueioDesfazer =
      await this._obterMotivoBloqueioDesfazer(historico);

    if (motivoBloqueioDesfazer) {
      throw criarErro(400, motivoBloqueioDesfazer);
    }

    // Reverte a ação; erros sobem para o middleware global de erro
    await this._reverterAcao(historico);

    if (historico.entidade === 'transacao') {
      await this._ajustarSaldoAoReverterTransacao(
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

  // Reverte uma ação específica
  static async _reverterAcao(historico) {
    const { entidade, acao, entidadeId, dadosAnteriores, usuario } = historico;

    switch (entidade) {
      case 'transacao':
        await this._reverterTransacao(
          acao,
          entidadeId,
          dadosAnteriores,
          usuario
        );
        break;
      case 'conta':
        await this._reverterConta(acao, entidadeId, dadosAnteriores, usuario);
        break;
      case 'carteira':
        await this._reverterCarteira(acao, dadosAnteriores, usuario);
        break;
      case 'salario':
        await this._reverterSalario(
          acao,
          entidadeId,
          dadosAnteriores,
          historico.dadosNovos,
          usuario,
          historico.createdAt
        );
        break;
      case 'listaDesejo':
        await this._reverterListaDesejo(
          acao,
          entidadeId,
          dadosAnteriores,
          historico.dadosNovos,
          usuario
        );
        break;
      default:
        throw criarErro(400, `Tipo de entidade não suportado: ${entidade}`);
    }
  }

  // Reverte ação de transação (apenas restaura o documento)
  // também valida que a conta associada ainda existe antes de efetuar
  // a restauração, evitando transações "ócas" que aparecem sem conta
  // no front-end.
  static async _reverterTransacao(
    acao,
    entidadeId,
    dadosAnteriores,
    usuarioId
  ) {
    const snapshotTransacao =
      this._normalizarSnapshotTransacao(dadosAnteriores);

    // para edição e exclusão, checar se o documento anterior
    // fazia referência a uma conta e, em caso afirmativo, se essa conta
    // ainda está presente no banco.
    if (acao === 'delecao' || acao === 'edicao') {
      const motivoBloqueioDesfazer = await this._obterMotivoBloqueioTransacao({
        acao,
        usuario: usuarioId,
        dadosAnteriores: snapshotTransacao,
      });

      if (motivoBloqueioDesfazer) {
        throw criarErro(400, motivoBloqueioDesfazer);
      }
    }

    await this._reverterCrudBasico(
      Transacao,
      acao,
      entidadeId,
      snapshotTransacao
    );
  }

  // Ajusta saldos de conta/carteira conforme os dados de transação
  // antes e depois da ação. Usado apenas durante desfazer().
  static async _ajustarSaldoAoReverterTransacao(
    acao,
    usuarioId,
    dadosAnteriores,
    dadosNovos
  ) {
    const dadosAnterioresNormalizados =
      this._normalizarSnapshotTransacao(dadosAnteriores);
    const dadosNovosNormalizados =
      this._normalizarSnapshotTransacao(dadosNovos);

    // helper local para calcular delta e aplicar
    const aplicarDelta = async (transacao, sinal = 1) => {
      if (!transacao || transacao.status !== 'pago') return;
      const valor = Number(transacao.valor || 0);
      if (!valor) return;
      const mult = transacao.tipo === 'entrada' ? 1 : -1;
      const delta = mult * valor * sinal;

      if (transacao.fonteSaldo === 'carteira') {
        await this._ajustarSaldoCarteira(usuarioId, delta);
      } else if (transacao.conta) {
        await this._ajustarSaldoConta(usuarioId, transacao.conta, delta);
      }
    };

    switch (acao) {
      case 'criacao':
        // desfaz criação: remove movimento aplicado originalmente
        await aplicarDelta(dadosNovosNormalizados, -1);
        break;
      case 'edicao':
        // desfaz edição: primeiro reverte o movimento novo, depois reaplica o
        // antigo
        await aplicarDelta(dadosNovosNormalizados, -1);
        await aplicarDelta(dadosAnterioresNormalizados, 1);
        break;
      case 'delecao':
        // desfaz exclusão: reaplica o movimento que havia sido retirado
        await aplicarDelta(dadosAnterioresNormalizados, 1);
        break;
      default:
        break;
    }
  }

  // Reverte ação de conta
  static async _reverterConta(acao, entidadeId, dadosAnteriores, usuarioId) {
    switch (acao) {
      case 'criacao':
      case 'edicao':
      case 'delecao':
        await this._reverterCrudBasico(
          Conta,
          acao,
          entidadeId,
          dadosAnteriores
        );
        break;
      case 'transferencia': {
        this._garantirDadosAnteriores(dadosAnteriores);

        const motivoBloqueioDesfazer = await this._obterMotivoBloqueioConta({
          acao,
          dadosAnteriores,
          usuario: usuarioId,
        });

        if (motivoBloqueioDesfazer) {
          throw criarErro(400, motivoBloqueioDesfazer);
        }

        const { contaOrigemId, contaDestinoId, saldoOrigem, saldoDestino } =
          dadosAnteriores;

        await this._restaurarSaldoConta(usuarioId, contaOrigemId, saldoOrigem);
        await this._restaurarSaldoConta(
          usuarioId,
          contaDestinoId,
          saldoDestino
        );
        break;
      }
    }
  }

  // Reverte ação de carteira
  static async _reverterCarteira(acao, dadosAnteriores, usuarioId) {
    if (acao !== 'transferencia') {
      throw criarErro(400, `Ação não suportada para carteira: ${acao}`);
    }

    this._garantirDadosAnteriores(dadosAnteriores);

    const motivoBloqueioDesfazer = await this._obterMotivoBloqueioCarteira({
      acao,
      dadosAnteriores,
      usuario: usuarioId,
    });

    if (motivoBloqueioDesfazer) {
      throw criarErro(400, motivoBloqueioDesfazer);
    }

    const { carteiraSaldo, contaId, contaSaldo } = dadosAnteriores;

    await this._restaurarSaldoCarteira(usuarioId, carteiraSaldo);
    await this._restaurarSaldoConta(usuarioId, contaId, contaSaldo);
  }

  static async _aplicarDeltaSalario(usuarioId, salario, sinal, dataReferencia) {
    if (!salarioJaProcessadoNoMes(salario, dataReferencia)) {
      return;
    }

    const valor = Number(salario?.valor || 0);
    if (!valor) {
      return;
    }

    const destino = extrairDestinoSaldo(salario);
    const delta = valor * sinal;

    if (destino.tipo === 'carteira') {
      await this._ajustarSaldoCarteira(usuarioId, delta);
      return;
    }

    if (destino.tipo === 'conta') {
      await this._ajustarSaldoConta(usuarioId, destino.contaId, delta);
    }
  }

  // Reverte ação de salário
  static async _reverterSalario(
    acao,
    entidadeId,
    dadosAnteriores,
    dadosNovos,
    usuarioId,
    dataAcao
  ) {
    const dataReferencia = dataAcao ? new Date(dataAcao) : new Date();

    switch (acao) {
      case 'criacao': {
        const ref = dadosNovos?.dataUltimoProcessamento
          ? new Date(dadosNovos.dataUltimoProcessamento)
          : dataReferencia;

        await this._aplicarDeltaSalario(usuarioId, dadosNovos, -1, ref);

        await Transacao.findByIdAndDelete(entidadeId);
        break;
      }
      case 'edicao': {
        this._garantirDadosAnteriores(dadosAnteriores);

        const motivoBloqueioDesfazer = await this._obterMotivoBloqueioSalario({
          acao,
          dadosAnteriores,
          usuario: usuarioId,
        });

        if (motivoBloqueioDesfazer) {
          throw criarErro(400, motivoBloqueioDesfazer);
        }

        const refAnt = dadosAnteriores?.dataUltimoProcessamento
          ? new Date(dadosAnteriores.dataUltimoProcessamento)
          : dataReferencia;
        const refNov = dadosNovos?.dataUltimoProcessamento
          ? new Date(dadosNovos.dataUltimoProcessamento)
          : dataReferencia;

        // Inverte os deltas aplicados na edição e volta o documento para o estado anterior.
        await this._aplicarDeltaSalario(usuarioId, dadosNovos, -1, refNov);
        await this._aplicarDeltaSalario(usuarioId, dadosAnteriores, 1, refAnt);

        await Transacao.findByIdAndUpdate(entidadeId, dadosAnteriores);
        break;
      }
      case 'delecao': {
        this._garantirDadosAnteriores(dadosAnteriores);

        const motivoBloqueioDesfazer = await this._obterMotivoBloqueioSalario({
          acao,
          dadosAnteriores,
          usuario: usuarioId,
        });

        if (motivoBloqueioDesfazer) {
          throw criarErro(400, motivoBloqueioDesfazer);
        }

        await Transacao.create(dadosAnteriores);

        const ref = dadosAnteriores?.dataUltimoProcessamento
          ? new Date(dadosAnteriores.dataUltimoProcessamento)
          : dataReferencia;

        await this._aplicarDeltaSalario(usuarioId, dadosAnteriores, 1, ref);
        break;
      }
      default:
        throw criarErro(400, `Ação não suportada para salário: ${acao}`);
    }
  }

  // Reverte ação de lista de desejo
  static async _reverterListaDesejo(
    acao,
    entidadeId,
    dadosAnteriores,
    dadosNovos,
    usuarioId
  ) {
    switch (acao) {
      case 'criacao':
      case 'edicao':
      case 'delecao':
        await this._reverterCrudBasico(
          ListaDesejo,
          acao,
          entidadeId,
          dadosAnteriores
        );
        break;
      case 'realizacao': {
        this._garantirDadosAnteriores(dadosAnteriores);

        const transacaoId = dadosNovos?.transacaoId;
        const transacaoRealizada = transacaoId
          ? await Transacao.findById(transacaoId)
          : null;

        // Reverte impacto no saldo para manter resumo consistente
        if (transacaoRealizada?.status === 'pago') {
          const valor = Number(transacaoRealizada.valor || 0);

          if (transacaoRealizada.fonteSaldo === 'carteira') {
            await this._ajustarSaldoCarteira(usuarioId, valor);
          } else if (transacaoRealizada.conta) {
            await this._ajustarSaldoConta(
              usuarioId,
              transacaoRealizada.conta,
              valor
            );
          }
        }

        if (transacaoId) {
          await Transacao.findByIdAndDelete(transacaoId);
        }

        const itemExistente = await ListaDesejo.findById(entidadeId);
        if (!itemExistente) {
          await ListaDesejo.create(dadosAnteriores);
        }

        break;
      }
    }
  }

  // Formata descrição genérica
  static formatarDescricao(acao, entidade) {
    const entidadeNome =
      {
        transacao: 'Transação',
        conta: 'Conta',
        carteira: 'Carteira',
        salario: 'Salário',
        listaDesejo: 'Lista de Desejo',
      }[entidade] || entidade;

    const acaoNome = conjugarAcao(acao, entidade);

    return `${entidadeNome} ${acaoNome}`;
  }
}

module.exports = HistoricoService;
