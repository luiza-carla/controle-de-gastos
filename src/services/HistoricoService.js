const Historico = require('../models/Historico');
const Usuario = require('../models/Usuario');
const logger = require('../utils/logger');
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
class HistoricoService {
  static _anexarDescricaoEObjeto(historico, objeto = null) {
    return {
      ...historico,
      descricao: formatarDescricaoHistoricoPadrao(
        historico.acao,
        historico.entidade
      ),
      objeto,
    };
  }

  static _garantirDadosAnteriores(dadosAnteriores) {
    if (!dadosAnteriores) {
      throw criarErro(400, 'Dados anteriores não disponíveis');
    }
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
  static async _buscarObjetoRelacionado(entidade, entidadeId) {
    if (!entidadeId) {
      return null;
    }

    try {
      if (entidade === 'transacao' || entidade === 'salario') {
        return await populateTransacao(Transacao.findById(entidadeId)).lean();
      }

      switch (entidade) {
        case 'conta':
          return await Conta.findById(entidadeId).lean();
        case 'carteira':
          return await Carteira.findById(entidadeId).lean();
        case 'listaDesejo':
          return await ListaDesejo.findById(entidadeId)
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

    const historicos = await Historico.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .lean();

    // Evita consultas repetidas quando varios historicos apontam para o mesmo objeto.
    const cacheObjetos = new Map();

    // helper interno para transformar IDs em objetos legíveis
    async function popularIds(obj) {
      if (!obj || typeof obj !== 'object') return obj;

      // Função utilitária para identificar strings que parecem ObjectId.
      const isObjectIdString = (value) =>
        typeof value === 'string' && /^[a-fA-F0-9]{24}$/.test(value);

      const categoriaPopulada =
        obj.categoria &&
        typeof obj.categoria === 'object' &&
        obj.categoria.nome;
      const categoriaEhId =
        obj.categoria &&
        (isObjectIdString(obj.categoria) || obj.categoria.toString);

      if (obj.categoria && !categoriaPopulada && categoriaEhId) {
        try {
          const Categoria = require('../models/Categoria');
          const cat = await Categoria.findById(obj.categoria).select(
            'nome cor tipo'
          );
          if (cat) obj.categoria = cat;
        } catch {
          // não crítico
        }
      }

      const subcategoriaPopulada =
        obj.subcategoria &&
        typeof obj.subcategoria === 'object' &&
        obj.subcategoria.nome;
      const subcategoriaEhId =
        obj.subcategoria &&
        (isObjectIdString(obj.subcategoria) || obj.subcategoria.toString);

      if (obj.subcategoria && !subcategoriaPopulada && subcategoriaEhId) {
        try {
          const Subcategoria = require('../models/Subcategoria');
          const sub = await Subcategoria.findById(obj.subcategoria).select(
            'nome'
          );
          if (sub) obj.subcategoria = sub;
        } catch {
          // não crítico
        }
      }

      return obj;
    }

    const historicosComObjetos = await Promise.all(
      historicos.map(async (historico) => {
        const chaveCache = `${historico.entidade}:${historico.entidadeId}`;

        if (historico.dadosNovos) {
          await popularIds(historico.dadosNovos);
        }
        if (historico.dadosAnteriores) {
          await popularIds(historico.dadosAnteriores);
        }

        if (!cacheObjetos.has(chaveCache)) {
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
            objetoRelacionado = await this._buscarObjetoRelacionado(
              historico.entidade,
              historico.entidadeId
            );
          }

          objetoRelacionado = await popularIds(objetoRelacionado);

          cacheObjetos.set(chaveCache, objetoRelacionado);
        }

        return this._anexarDescricaoEObjeto(
          historico,
          cacheObjetos.get(chaveCache)
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
  static async buscarPorEntidade(entidade, entidadeId) {
    const historicos = await Historico.find({
      entidade,
      entidadeId,
    })
      .sort({ createdAt: -1 })
      .lean();

    // Busca o objeto relacionado uma única vez
    const objeto = await this._buscarObjetoRelacionado(entidade, entidadeId);

    return historicos.map((historico) =>
      this._anexarDescricaoEObjeto(historico, objeto)
    );
  }

  // Limpa histórico antigo após a conta completar X dias de criação.
  static async limparAntigo(dias = 30) {
    if (dias <= 0) {
      throw criarErro(400, 'Dias deve ser um número positivo');
    }

    const dataLimite = new Date();
    dataLimite.setDate(dataLimite.getDate() - dias);

    // Só participa da limpeza quem já tem conta criada há pelo menos X dias.
    const usuariosElegiveis = await Usuario.find(
      { createdAt: { $lte: dataLimite } },
      { _id: 1 }
    ).lean();

    if (usuariosElegiveis.length === 0) {
      return 0;
    }

    const usuariosIds = usuariosElegiveis.map((usuario) => usuario._id);

    const resultado = await Historico.deleteMany({
      usuario: { $in: usuariosIds },
      createdAt: { $lt: dataLimite },
    });

    return resultado.deletedCount;
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
        primeiraLimpezaHistorico: { $ne: false },
        createdAt: { $lte: dataLimiteCiclo },
      },
      { _id: 1 }
    ).lean();

    const usuariosCiclo = await Usuario.find(
      {
        primeiraLimpezaHistorico: false,
        ultimaLimpezaHistorico: { $lte: dataLimiteCiclo },
      },
      { _id: 1 }
    ).lean();

    const usuariosPrimeiraLimpezaIds = usuariosPrimeira.map((u) => u._id);
    const usuariosCicloIds = usuariosCiclo.map((u) => u._id);

    if (!usuariosPrimeiraLimpezaIds.length && !usuariosCicloIds.length) {
      return 0;
    }

    let totalRemovidos = 0;

    // Para a primeira limpeza do usuário: remove TODO o histórico dele.
    if (usuariosPrimeiraLimpezaIds.length) {
      const resultado = await Historico.deleteMany({
        usuario: { $in: usuariosPrimeiraLimpezaIds },
      });
      totalRemovidos += resultado.deletedCount;

      await Usuario.updateMany(
        { _id: { $in: usuariosPrimeiraLimpezaIds } },
        {
          $set: {
            primeiraLimpezaHistorico: false,
            ultimaLimpezaHistorico: hoje,
          },
        }
      );
    }

    // Para limpezas de ciclo subsequentes: respeita retenção (se configurada).
    if (usuariosCicloIds.length) {
      const filtro = { usuario: { $in: usuariosCicloIds } };
      if (diasRetencao > 0) {
        const dataLimiteRetencao = new Date();
        dataLimiteRetencao.setDate(dataLimiteRetencao.getDate() - diasRetencao);
        filtro.createdAt = { $lt: dataLimiteRetencao };
      }

      const resultado = await Historico.deleteMany(filtro);
      totalRemovidos += resultado.deletedCount;

      await Usuario.updateMany(
        { _id: { $in: usuariosCicloIds } },
        { $set: { ultimaLimpezaHistorico: hoje } }
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

    return { success: true, message: 'Ação desfeita com sucesso' };
  }

  // Reverte uma ação específica
  static async _reverterAcao(historico) {
    const { entidade, acao, entidadeId, dadosAnteriores, usuario } = historico;

    switch (entidade) {
      case 'transacao':
        await this._reverterTransacao(acao, entidadeId, dadosAnteriores);
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
  static async _reverterTransacao(acao, entidadeId, dadosAnteriores) {
    // para edição e exclusão, checar se o documento anterior
    // fazia referência a uma conta e, em caso afirmativo, se essa conta
    // ainda está presente no banco.
    if (acao === 'delecao' || acao === 'edicao') {
      const contaRef = dadosAnteriores?.conta;
      const contaId = extrairContaId(contaRef);
      if (contaId) {
        const contaExiste = await Conta.exists({ _id: contaId });
        if (!contaExiste) {
          throw criarErro(
            400,
            'Não é possível desfazer transação porque a conta associada foi removida'
          );
        }
      }
    }

    await this._reverterCrudBasico(
      Transacao,
      acao,
      entidadeId,
      dadosAnteriores
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
        await aplicarDelta(dadosNovos, -1);
        break;
      case 'edicao':
        // desfaz edição: primeiro reverte o movimento novo, depois reaplica o
        // antigo
        await aplicarDelta(dadosNovos, -1);
        await aplicarDelta(dadosAnteriores, 1);
        break;
      case 'delecao':
        // desfaz exclusão: reaplica o movimento que havia sido retirado
        await aplicarDelta(dadosAnteriores, 1);
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
      case 'criacao':
        await this._aplicarDeltaSalario(
          usuarioId,
          dadosNovos,
          -1,
          dataReferencia
        );
        await Transacao.findByIdAndDelete(entidadeId);
        break;
      case 'edicao': {
        this._garantirDadosAnteriores(dadosAnteriores);

        // antes de voltar para o estado anterior, verifica se ainda é
        // válido (por exemplo, conta de destino não foi removida)
        const destinoAnt = extrairDestinoSaldo(dadosAnteriores);
        if (destinoAnt.tipo === 'conta') {
          const contaExiste = await Conta.exists({
            _id: destinoAnt.contaId,
            usuario: usuarioId,
          });
          if (!contaExiste) {
            throw criarErro(
              400,
              'Não é possível desfazer edição do salário porque a conta de destino foi removida'
            );
          }
        }

        // Inverte os deltas aplicados na edição e volta o documento para o estado anterior.
        await this._aplicarDeltaSalario(
          usuarioId,
          dadosNovos,
          -1,
          dataReferencia
        );
        await this._aplicarDeltaSalario(
          usuarioId,
          dadosAnteriores,
          1,
          dataReferencia
        );

        await Transacao.findByIdAndUpdate(entidadeId, dadosAnteriores);
        break;
      }
      case 'delecao': {
        this._garantirDadosAnteriores(dadosAnteriores);

        // Se o salário tinha destino em conta, certifica de que a conta
        // ainda exista antes de recriar o registro. Caso contrário, permitir
        // o undo resultaria em transação órfã e em inconsistência de saldo.
        const destino = extrairDestinoSaldo(dadosAnteriores);
        if (destino.tipo === 'conta') {
          const contaExiste = await Conta.exists({
            _id: destino.contaId,
            usuario: usuarioId,
          });
          if (!contaExiste) {
            throw criarErro(
              400,
              'Não é possível desfazer exclusão do salário porque a conta de destino foi removida'
            );
          }
        }

        await Transacao.create(dadosAnteriores);
        await this._aplicarDeltaSalario(
          usuarioId,
          dadosAnteriores,
          1,
          dataReferencia
        );
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
