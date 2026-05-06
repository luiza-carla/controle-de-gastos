const Transacao = require('../models/Transacao');
const HistoricoService = require('../services/historico');
const SaldoService = require('../services/saldo');
const { formatarMoeda } = require('../utils/stringHelpers');
const { registrarHistoricoDaRequisicao } = require('../utils/historicoHelpers');
const { criarErro } = require('../utils/errorHelpers');
const categoriaHelpers = require('../utils/categoriaHelpers');
const { salario: populateSalario } = require('../utils/populateHelpers');
const {
  salarioJaProcessadoNoMes,
  extrairContaId,
  extrairDestinoSaldo,
} = require('../utils/salarioHelpers');
const { selecionarCamposPermitidos } = require('../utils/payloadHelpers');

const MENSAGEM_CATEGORIA_SALARIO_NAO_ENCONTRADA =
  'Categoria Salário não encontrada';
const MENSAGEM_SALARIO_NAO_ENCONTRADO = 'Salário não encontrado';
const CAMPOS_PERMITIDOS_SALARIO = [
  'titulo',
  'valor',
  'conta',
  'diaRecebimento',
  'frequencia',
];

function montarDescricaoHistoricoSalario(acao, salario) {
  const descricaoBase = HistoricoService.formatarDescricao(acao, 'salario');
  return `${descricaoBase}: ${salario.titulo} - ${formatarMoeda(salario.valor)}`;
}

// (população de relações usada por vários módulos) utilizei helper externo
// que exporta a mesma configuração de populate.
class SalarioController {
  constructor() {
    this.listar = this.listar.bind(this);
    this.criar = this.criar.bind(this);
    this.atualizar = this.atualizar.bind(this);
    this.deletar = this.deletar.bind(this);
  }

  // Retorna referência à categoria/subcategoria de salário ou responde
  // erro 400. O objeto retornado tem
  //   { categoria, subcategoria }.
  async buscarCategoriaSalarioOuResponder() {
    const refs = await categoriaHelpers.buscarSalario();

    if (!refs || !refs.categoria) {
      throw criarErro(400, MENSAGEM_CATEGORIA_SALARIO_NAO_ENCONTRADA);
    }

    return refs;
  }

  // Busca salário do usuário por id e referências de categoria/subcategoria
  async buscarSalarioDoUsuario(id, usuarioId, refs) {
    const { filtroUsuario } = categoriaHelpers.obterFiltrosSalario(
      refs,
      usuarioId
    );

    const filtroBase = { _id: id, usuario: usuarioId };
    if (!filtroUsuario) return Transacao.findOne(filtroBase);

    return Transacao.findOne({ ...filtroBase, ...filtroUsuario }).setOptions({
      sanitizeFilter: false,
    });
  }

  // Verifica se salário deve ser processado na data informada
  salarioDeveSerProcessadoAgora(salario, dataReferencia = new Date()) {
    if (!salario || !salario.ativa) {
      return false;
    }

    const fonteSaldo = salario.fonteSaldo || 'conta';
    const contaId = extrairContaId(salario.conta);
    const destinoValido = fonteSaldo === 'carteira' || !!contaId;

    if (!destinoValido) {
      return false;
    }

    const diaRecebimento = Number(salario.diaRecebimento || 5);
    return diaRecebimento <= dataReferencia.getDate();
  }

  // Normaliza destino de saldo recebido no payload
  normalizarDestinoSaldo(payload = {}) {
    if (payload.conta === 'carteira') {
      return {
        conta: null,
        fonteSaldo: 'carteira',
      };
    }

    const contaId = extrairContaId(payload.conta);
    return {
      conta: contaId,
      fonteSaldo: 'conta',
    };
  }

  // as alterações de saldo agora são centralizadas em SaldoService

  // Lista todos os salários do usuário
  async listar(req, res) {
    const refs = await categoriaHelpers.buscarSalario();
    const { filtroUsuario: filtroSalario } =
      categoriaHelpers.obterFiltrosSalario(refs, req.user.id);

    if (!filtroSalario) {
      return res.json([]);
    }

    const salarios = await populateSalario(
      Transacao.find(filtroSalario)
        .setOptions({ sanitizeFilter: false })
        .sort({ data: -1, createdAt: -1 })
    );

    res.json(salarios);
  }

  // Cria novo salário recorrente
  async criar(req, res) {
    const refs = await this.buscarCategoriaSalarioOuResponder();
    if (!refs) return;

    const payload = selecionarCamposPermitidos(
      req.body,
      CAMPOS_PERMITIDOS_SALARIO
    );
    const destinoSaldo = this.normalizarDestinoSaldo(payload);

    await SaldoService.validarContaAceitaEntrada({
      usuarioId: req.user.id,
      contaId: destinoSaldo.conta,
      fonteSaldo: destinoSaldo.fonteSaldo,
    });

    const hoje = new Date();

    const salario = await Transacao.create({
      ...payload,
      ...destinoSaldo,
      usuario: req.user.id,
      categoria: refs.categoria._id,
      subcategoria: refs.subcategoria?._id || null,
      tipo: 'entrada',
      titulo: payload.titulo || 'Salário',
      status: 'pendente',
      ativa: true,
    });

    if (this.salarioDeveSerProcessadoAgora(salario, hoje)) {
      const destino = extrairDestinoSaldo(salario);

      if (destino.tipo === 'conta') {
        await SaldoService.aplicarDeltaContas(
          { [destino.contaId]: salario.valor },
          req.user.id
        );
      }

      if (destino.tipo === 'carteira') {
        await SaldoService.aplicarDeltaCarteira(salario.valor, req.user.id);
      }

      await Transacao.updateOne(
        { _id: salario._id },
        { dataUltimoProcessamento: hoje, status: 'pago' }
      );
    }

    const salarioPopulado = await populateSalario(
      Transacao.findById(salario._id)
    );

    await registrarHistoricoDaRequisicao(req, 'salario', {
      entidadeId: salarioPopulado._id,
      acao: 'criacao',
      descricao: montarDescricaoHistoricoSalario('criacao', salarioPopulado),
      dadosNovos: salarioPopulado.toObject(),
    });

    res.status(201).json(salarioPopulado);
  }

  // Atualiza salário existente
  async atualizar(req, res) {
    const refs = await this.buscarCategoriaSalarioOuResponder();
    if (!refs) return;

    const transacaoAntiga = await this.buscarSalarioDoUsuario(
      req.params.id,
      req.user.id,
      refs
    );

    if (!transacaoAntiga) {
      return res
        .status(404)
        .json({ mensagem: MENSAGEM_SALARIO_NAO_ENCONTRADO });
    }

    const hoje = new Date();
    const antigoProcessadoNoMes = salarioJaProcessadoNoMes(
      transacaoAntiga,
      hoje
    );

    const payloadAtualizacao = selecionarCamposPermitidos(
      req.body,
      CAMPOS_PERMITIDOS_SALARIO
    );

    if (Object.prototype.hasOwnProperty.call(req.body, 'conta')) {
      const destinoSaldo = this.normalizarDestinoSaldo(payloadAtualizacao);
      payloadAtualizacao.conta = destinoSaldo.conta;
      payloadAtualizacao.fonteSaldo = destinoSaldo.fonteSaldo;

      await SaldoService.validarContaAceitaEntrada({
        usuarioId: req.user.id,
        contaId: destinoSaldo.conta,
        fonteSaldo: destinoSaldo.fonteSaldo,
      });
    }

    const salarioPopulado = await populateSalario(
      Transacao.findOneAndUpdate(
        {
          _id: req.params.id,
          usuario: req.user.id,
          categoria: refs.categoria._id,
          ...(refs.subcategoria ? { subcategoria: refs.subcategoria._id } : {}),
        },
        payloadAtualizacao,
        { returnDocument: 'after' }
      )
    );

    const novoProcessadoNoMes = this.salarioDeveSerProcessadoAgora(
      salarioPopulado,
      hoje
    );

    const deltasConta = {};
    let deltaCarteira = 0;

    const destinoAntigo = extrairDestinoSaldo(transacaoAntiga);
    const destinoNovo = extrairDestinoSaldo(salarioPopulado);

    if (antigoProcessadoNoMes) {
      if (destinoAntigo.tipo === 'conta') {
        deltasConta[destinoAntigo.contaId] =
          (deltasConta[destinoAntigo.contaId] || 0) - transacaoAntiga.valor;
      }

      if (destinoAntigo.tipo === 'carteira') {
        deltaCarteira -= transacaoAntiga.valor;
      }
    }

    if (novoProcessadoNoMes) {
      if (destinoNovo.tipo === 'conta') {
        deltasConta[destinoNovo.contaId] =
          (deltasConta[destinoNovo.contaId] || 0) + salarioPopulado.valor;
      }

      if (destinoNovo.tipo === 'carteira') {
        deltaCarteira += salarioPopulado.valor;
      }
    }

    await SaldoService.aplicarDeltaContas(deltasConta, req.user.id);
    await SaldoService.aplicarDeltaCarteira(deltaCarteira, req.user.id);

    await Transacao.updateOne(
      { _id: salarioPopulado._id },
      {
        dataUltimoProcessamento: novoProcessadoNoMes ? hoje : null,
        status: novoProcessadoNoMes ? 'pago' : 'pendente',
      }
    );

    const salarioAtualizado = await populateSalario(
      Transacao.findById(salarioPopulado._id)
    );

    // Registra no histórico
    await registrarHistoricoDaRequisicao(req, 'salario', {
      entidadeId: salarioPopulado._id,
      acao: 'edicao',
      descricao: montarDescricaoHistoricoSalario('edicao', salarioAtualizado),
      dadosAnteriores: transacaoAntiga.toObject(),
      dadosNovos: salarioAtualizado.toObject(),
    });

    res.json(salarioAtualizado);
  }

  // Deleta salário e reverte saldo se necessário
  async deletar(req, res) {
    const refs = await this.buscarCategoriaSalarioOuResponder();
    if (!refs) return;

    const salario = await this.buscarSalarioDoUsuario(
      req.params.id,
      req.user.id,
      refs
    );

    if (!salario) {
      return res
        .status(404)
        .json({ mensagem: MENSAGEM_SALARIO_NAO_ENCONTRADO });
    }

    const destino = extrairDestinoSaldo(salario);

    if (salario.status === 'pago') {
      if (destino.tipo === 'conta') {
        await SaldoService.aplicarDeltaContas(
          { [destino.contaId]: -salario.valor },
          req.user.id
        );
      }

      if (destino.tipo === 'carteira') {
        await SaldoService.aplicarDeltaCarteira(-salario.valor, req.user.id);
      }
    }

    await salario.deleteOne();

    // Registra no histórico
    await registrarHistoricoDaRequisicao(req, 'salario', {
      entidadeId: salario._id,
      acao: 'delecao',
      descricao: montarDescricaoHistoricoSalario('delecao', salario),
      dadosAnteriores: salario.toObject(),
    });

    res.json({ mensagem: 'Salário deletado' });
  }
}

module.exports = new SalarioController();
