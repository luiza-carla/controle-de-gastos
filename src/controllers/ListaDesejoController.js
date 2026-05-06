const ListaDesejo = require('../models/ListaDesejo');
const Transacao = require('../models/Transacao');
const Conta = require('../models/Conta');
const {
  validarSubcategoriaParaCategoria,
  processarSubcategoriaAoAtualizar,
} = require('../utils/subcategoriaUtils');
const HistoricoService = require('../services/historico');
const SaldoService = require('../services/saldo');
const FaturaService = require('../services/fatura');
const { formatarMoeda } = require('../utils/stringHelpers');
const { registrarHistoricoDaRequisicao } = require('../utils/historicoHelpers');
const { criarErro } = require('../utils/errorHelpers');
const { selecionarCamposPermitidos } = require('../utils/payloadHelpers');
const { contaEhCredito } = require('../utils/contaHelpers');
const { normalizarDinheiro } = require('../utils/money');

const MENSAGEM_ITEM_NAO_ENCONTRADO = 'Item da lista de desejos nao encontrado';
const PROJECAO_CATEGORIA = 'nome cor tipo slug';
const CAMPOS_PERMITIDOS_LISTA_DESEJO_ATUALIZACAO = [
  'titulo',
  'valor',
  'categoria',
  'subcategoria',
  'tags',
  'tipoDespesa',
];

function popularCategoria(query) {
  return query
    .populate('categoria', PROJECAO_CATEGORIA)
    .populate('subcategoria', 'nome');
}

// reuso de populate para transações
const { transacao: populateTransacao } = require('../utils/populateHelpers');

function buscarItemDoUsuario(itemId, usuarioId) {
  return popularCategoria(
    ListaDesejo.findOne({
      _id: itemId,
      usuario: usuarioId,
    })
  );
}

function montarUpdateData(body) {
  const updateData = selecionarCamposPermitidos(
    body,
    CAMPOS_PERMITIDOS_LISTA_DESEJO_ATUALIZACAO
  );

  // Se subcategoria foi enviada como string vazia, consideramos como remoção.
  if ('subcategoria' in updateData && !updateData.subcategoria) {
    updateData.subcategoria = null;
  }

  return updateData;
}

function montarDescricaoHistorico(acao, titulo) {
  const descricaoBase = HistoricoService.formatarDescricao(acao, 'listaDesejo');
  return `${descricaoBase}: ${titulo}`;
}

class ListaDesejoController {
  // Cria item da lista de desejos
  async criar(req, res) {
    const { titulo, valor, categoria, subcategoria, tags, tipoDespesa } =
      req.body;

    // se houver subcategoria, validamos que ela pertence à categoria
    if (subcategoria) {
      const valido = await validarSubcategoriaParaCategoria(
        subcategoria,
        categoria
      );
      if (!valido) {
        throw criarErro(
          400,
          'Subcategoria inválida para a categoria selecionada'
        );
      }
    }

    const novoItem = await ListaDesejo.create({
      usuario: req.user.id,
      titulo,
      valor,
      categoria,
      subcategoria: subcategoria || null,
      tags: tags || [],
      tipoDespesa,
    });

    const itemCompleto = await popularCategoria(
      ListaDesejo.findById(novoItem._id)
    );

    // Registra no histórico
    await registrarHistoricoDaRequisicao(req, 'listaDesejo', {
      entidadeId: novoItem._id,
      acao: 'criacao',
      descricao: montarDescricaoHistorico('criacao', titulo),
      dadosNovos: novoItem.toObject(),
    });

    res.status(201).json(itemCompleto);
  }

  // Lista itens da lista de desejos do usuario
  async listar(req, res) {
    const ordenarPor = req.query.ordenarPor || req.query.sortBy;
    const sort = ordenarPor === 'nome' ? { titulo: 1 } : { createdAt: -1 };

    const itens = await popularCategoria(
      ListaDesejo.find({ usuario: req.user.id }).sort(sort)
    );

    res.json(itens);
  }

  // Atualiza item da lista de desejos
  async atualizar(req, res) {
    const itemAntigo = await buscarItemDoUsuario(req.params.id, req.user.id);

    let updateData = montarUpdateData(req.body);

    // se precisarmos apagar algum campo, acumulamos em $unset
    const unsetOps = {};

    // valida subcategoria se informada
    if (updateData.subcategoria) {
      const categoriaId = updateData.categoria || itemAntigo.categoria;
      const valido = await validarSubcategoriaParaCategoria(
        updateData.subcategoria,
        categoriaId
      );
      if (!valido) {
        throw criarErro(
          400,
          'Subcategoria inválida para a categoria selecionada'
        );
      }
    }

    const { unsetOps: subUnset } = await processarSubcategoriaAoAtualizar({
      updateData,
      docAntigo: itemAntigo,
    });

    Object.assign(unsetOps, subUnset);

    const mongoUpdate = { ...updateData };
    if (Object.keys(unsetOps).length) {
      mongoUpdate.$unset = unsetOps;
    }

    const item = await popularCategoria(
      ListaDesejo.findOneAndUpdate(
        { _id: req.params.id, usuario: req.user.id },
        mongoUpdate,
        { returnDocument: 'after' }
      )
    );

    if (!item) {
      throw criarErro(404, MENSAGEM_ITEM_NAO_ENCONTRADO);
    }

    // Registra no histórico
    if (itemAntigo) {
      await registrarHistoricoDaRequisicao(req, 'listaDesejo', {
        entidadeId: item._id,
        acao: 'edicao',
        descricao: montarDescricaoHistorico('edicao', item.titulo),
        dadosAnteriores: itemAntigo.toObject(),
        dadosNovos: item.toObject(),
      });
    }

    res.json(item);
  }

  // Remove item da lista de desejos
  async deletar(req, res) {
    const item = await ListaDesejo.findOneAndDelete({
      _id: req.params.id,
      usuario: req.user.id,
    });

    if (!item) {
      throw criarErro(404, MENSAGEM_ITEM_NAO_ENCONTRADO);
    }

    // Registra no histórico
    await registrarHistoricoDaRequisicao(req, 'listaDesejo', {
      entidadeId: item._id,
      acao: 'delecao',
      descricao: montarDescricaoHistorico('delecao', item.titulo),
      dadosAnteriores: item.toObject(),
    });

    res.json({ mensagem: 'Desejo deletado' });
  }

  // Realiza desejo: cria transação e remove item em uma ação única de histórico
  async realizar(req, res) {
    const item = await buscarItemDoUsuario(req.params.id, req.user.id);

    if (!item) {
      throw criarErro(404, MENSAGEM_ITEM_NAO_ENCONTRADO);
    }

    const { conta, valor, status, data } = req.body;
    const valorFinal = normalizarDinheiro(valor || item.valor || 0);
    const statusFinal = status || 'pago';
    const fonteSaldo = conta === 'carteira' ? 'carteira' : 'conta';

    if (!conta) {
      throw criarErro(400, 'Conta é obrigatória');
    }

    if (!valorFinal || valorFinal <= 0) {
      throw criarErro(400, 'Valor inválido');
    }

    const contaSelecionada =
      fonteSaldo === 'conta'
        ? await Conta.findOne({ _id: conta, usuario: req.user.id })
        : null;

    if (fonteSaldo === 'conta' && !contaSelecionada) {
      throw criarErro(404, 'Conta não encontrada');
    }

    if (contaEhCredito(contaSelecionada)) {
      await FaturaService.validarTransacaoProjetada({
        usuarioId: req.user.id,
        transacaoNova: {
          conta,
          fonteSaldo,
          valor: valorFinal,
          tipo: 'saida',
          status: statusFinal,
        },
      });
    } else {
      await SaldoService.validarTransacaoProjetada({
        usuarioId: req.user.id,
        transacaoNova: {
          conta: fonteSaldo === 'carteira' ? null : conta,
          fonteSaldo,
          valor: valorFinal,
          tipo: 'saida',
          status: statusFinal,
        },
      });
    }

    const tipoDespesa =
      item.tipoDespesa && typeof item.tipoDespesa === 'string'
        ? item.tipoDespesa
        : undefined;

    const novaTransacao = await Transacao.create({
      usuario: req.user.id,
      conta: fonteSaldo === 'carteira' ? undefined : conta,
      fonteSaldo,
      titulo: item.titulo,
      valor: valorFinal,
      tipo: 'saida',
      categoria: item.categoria?._id,
      subcategoria: item.subcategoria?._id || null,
      data: data || Date.now(),
      status: statusFinal,
      recorrencia: 'nenhuma',
      parcelamento: {
        totalParcelas: 1,
        parcelaAtual: 1,
      },
      tags: item.tags || [],
      tipoDespesa,
    });

    if (statusFinal === 'pago') {
      if (contaEhCredito(contaSelecionada)) {
        await FaturaService.aplicarCompra(novaTransacao, req.user.id);
      } else {
        await SaldoService.aplicarMovimento(
          {
            conta: conta,
            fonteSaldo,
            valor: valorFinal,
            tipo: 'saida',
            status: 'pago',
          },
          req.user.id
        );
      }
    }

    await ListaDesejo.findByIdAndDelete(item._id);

    const snapshotDesejoRealizado = {
      ...item.toObject(),
      transacaoId: novaTransacao._id,
      conta: fonteSaldo === 'carteira' ? 'carteira' : conta,
      valor: valorFinal,
      status: statusFinal,
    };

    await registrarHistoricoDaRequisicao(req, 'listaDesejo', {
      entidadeId: item._id,
      acao: 'realizacao',
      descricao: `Desejo realizado: ${item.titulo} (${formatarMoeda(valorFinal)})`,
      dadosAnteriores: item.toObject(),
      dadosNovos: snapshotDesejoRealizado,
    });

    const transacaoCompleta = await populateTransacao(
      Transacao.findById(novaTransacao._id)
    );

    res.status(201).json({
      mensagem: 'Desejo realizado com sucesso',
      transacao: transacaoCompleta,
    });
  }
}

module.exports = new ListaDesejoController();
