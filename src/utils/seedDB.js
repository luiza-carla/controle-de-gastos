//Criação de conta e dados teste para desenvolvimento e testes locais
const { faker } = require('@faker-js/faker');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Models
const Usuario = require('../models/Usuario');
const Carteira = require('../models/Carteira');
const Conta = require('../models/Conta');
const Categoria = require('../models/Categoria');
const Transacao = require('../models/Transacao');
const ListaDesejo = require('../models/ListaDesejo');
const Historico = require('../models/Historico');
const logger = require('./logger');

// Importar função de seed de categorias
const garantirCategoriasPadrao = require('./seedCategoria');
const { formatarDescricaoHistoricoPadrao } = require('./historicoDescricao');

// Configuração do Faker para pt-BR
faker.locale = 'pt_BR';

const DEFAULT_SEED_OPTIONS = {
  numContasPorUsuario: 3,
  numTransacoesPorUsuario: 30,
  numSalariosPorUsuario: 2,
  numListaDesejoPorUsuario: 30,
  numHistoricoPorUsuario: 30,
  limparAntes: true,
  limparTudo: false,
};

const MODELS_LIMPEZA = [Carteira, Conta, Transacao, ListaDesejo, Historico];

// Cria documentos em lote executando factory para cada item
async function criarEmLote(quantidade, criarItem, Model) {
  const documentos = [];

  for (let i = 0; i < quantidade; i++) {
    documentos.push(criarItem(i));
  }

  if (documentos.length === 0) {
    return [];
  }

  return Model.insertMany(documentos);
}

// Limpa dados relacionados a um conjunto de usuários
async function limparDadosPorUsuarios(usuariosIds) {
  if (!usuariosIds?.length) {
    return;
  }

  await Promise.all(
    MODELS_LIMPEZA.map((Model) =>
      Model.deleteMany({ usuario: { $in: usuariosIds } })
    )
  );
}

async function limparDadosSeed({ limparTudo, emailUsuarioTeste }) {
  if (limparTudo) {
    await Promise.all([
      Usuario.deleteMany({}),
      ...MODELS_LIMPEZA.map((Model) => Model.deleteMany({})),
    ]);
    return;
  }

  // Limpa apenas os dados do usuário usado no seed para não afetar produção.
  const usuariosSeed = await Usuario.find(
    { email: emailUsuarioTeste },
    { _id: 1 }
  ).lean();

  await limparDadosPorUsuarios(usuariosSeed.map((usuario) => usuario._id));
}

async function obterOuAtualizarUsuarioTeste({
  nomeUsuarioTeste,
  emailUsuarioTeste,
  senhaUsuarioTeste,
}) {
  const senhaTesteBcrypt = await bcrypt.hash(senhaUsuarioTeste, 10);

  return Usuario.findOneAndUpdate(
    { email: emailUsuarioTeste },
    {
      $set: {
        nome: nomeUsuarioTeste,
        senha: senhaTesteBcrypt,
      },
      $setOnInsert: {
        email: emailUsuarioTeste,
      },
    },
    {
      returnDocument: 'after',
      upsert: true,
      runValidators: true,
    }
  );
}

/**
 * Gera uma carteira para um usuário
 */
function gerarCarteira(usuarioId) {
  return {
    usuario: usuarioId,
    saldo: faker.number.float({ min: 0, max: 300, precision: 0.01 }),
    ativa: faker.datatype.boolean(0.9), // 90% de chance de estar ativa
  };
}

/**
 * Gera uma conta para um usuário
 */
function gerarConta(usuarioId) {
  const tipos = ['corrente', 'credito', 'investimento'];
  const tipo = faker.helpers.arrayElement(tipos);

  const nomes = {
    corrente: [
      'Nubank',
      'Inter',
      'C6 Bank',
      'Banco do Brasil',
      'Itaú',
      'Bradesco',
      'Santander',
      'Caixa',
    ],
    credito: [
      'Cartão Nubank',
      'Cartão Inter',
      'Cartão C6',
      'Cartão BB',
      'Cartão Itaú',
    ],
    investimento: [
      'Tesouro Direto',
      'CDB Inter',
      'Ações',
      'Fundos Imobiliários',
      'Poupança',
    ],
  };

  return {
    usuario: usuarioId,
    nome: faker.helpers.arrayElement(nomes[tipo]),
    tipo: tipo,
    saldo: faker.number.float({ min: 0, max: 600, precision: 0.01 }),
    ativa: faker.datatype.boolean(0.9),
  };
}

/**
 * Gera uma transação para um usuário
 */
function gerarTransacao(usuarioId, contaId, categorias) {
  const tipo = faker.helpers.arrayElement(['entrada', 'saida']);

  // Excluir categoria "Salário" das transações normais
  const categoriasDisponiveis = categorias.filter((c) => c.nome !== 'Salário');
  const categoria = faker.helpers.arrayElement(categoriasDisponiveis);
  const fonteSaldo = faker.helpers.arrayElement(['conta', 'carteira']);

  // Gerar datas no mês atual para aparecerem no resumo
  const hoje = new Date();
  const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  const fimMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);

  const transacao = {
    usuario: usuarioId,
    conta: fonteSaldo === 'conta' ? contaId : null,
    fonteSaldo: fonteSaldo,
    titulo: faker.commerce.productName(),
    valor: faker.number.float({ min: 5, max: 180, precision: 0.01 }),
    tipo: tipo,
    categoria: categoria._id,
    data: faker.date.between({
      from: inicioMes,
      to: fimMes,
    }),
    ativa: true,
    tags: faker.helpers.arrayElements(
      ['urgente', 'planejado', 'imprevisto', 'fixo', 'variável', 'lazer'],
      faker.number.int({ min: 0, max: 3 })
    ),
    recorrencia: faker.helpers.arrayElement(['nenhuma', 'mensal']),
    status: faker.datatype.boolean(0.8) ? 'pago' : 'pendente', // 80% pagas
  };

  // Adicionar tipoDespesa apenas para saídas
  if (tipo === 'saida') {
    transacao.tipoDespesa = faker.helpers.arrayElement([
      'essencial',
      'eventual',
      'opcional',
    ]);
  }

  // Adicionar dados de recorrência se aplicável
  if (transacao.recorrencia === 'mensal') {
    transacao.frequencia = 'mensal';
    transacao.diaRecebimento = faker.number.int({ min: 1, max: 28 });
    transacao.dataUltimoProcessamento = faker.date.recent({ days: 30 });
  }

  // Adicionar parcelamento ocasionalmente
  if (faker.datatype.boolean(0.3)) {
    // 30% de chance
    const totalParcelas = faker.number.int({ min: 2, max: 12 });
    transacao.parcelamento = {
      totalParcelas: totalParcelas,
      parcelaAtual: faker.number.int({ min: 1, max: totalParcelas }),
    };
  }

  return transacao;
}

/**
 * Gera um item de lista de desejo para um usuário
 */
function gerarListaDesejo(usuarioId, categorias) {
  const categoria = faker.helpers.arrayElement(categorias);

  return {
    usuario: usuarioId,
    titulo: faker.commerce.product(),
    valor: faker.number.float({ min: 30, max: 250, precision: 0.01 }),
    categoria: categoria._id,
    tipoDespesa: faker.helpers.arrayElement([
      'essencial',
      'eventual',
      'opcional',
    ]),
    tags: faker.helpers.arrayElements(
      ['meta', 'sonho', 'prioridade', 'futuro', 'luxo'],
      faker.number.int({ min: 0, max: 3 })
    ),
  };
}

/**
 * Gera um salário recorrente para um usuário
 */
function gerarSalario(usuarioId, contaId, categoriaSalario) {
  const titulos = [
    'Salário',
    'Salário CLT',
    'Pagamento Mensal',
    'Remuneração',
    'Salário + Benefícios',
  ];

  const diaRecebimento = faker.number.int({ min: 1, max: 28 });
  const hoje = new Date();

  // 70% de chance de já ter sido processado este mês
  const jaProcessado = faker.datatype.boolean(0.7);
  const status = jaProcessado ? 'pago' : 'pendente';
  const dataUltimoProcessamento = jaProcessado
    ? new Date(hoje.getFullYear(), hoje.getMonth(), diaRecebimento)
    : null;

  return {
    usuario: usuarioId,
    conta: contaId,
    fonteSaldo: 'conta',
    titulo: faker.helpers.arrayElement(titulos),
    valor: faker.number.float({ min: 300, max: 1200, precision: 0.01 }),
    tipo: 'entrada',
    categoria: categoriaSalario._id,
    data: new Date(hoje.getFullYear(), hoje.getMonth(), diaRecebimento),
    ativa: true,
    tags: ['salario', 'fixo', 'mensal'],
    recorrencia: 'mensal',
    frequencia: 'mensal',
    diaRecebimento: diaRecebimento,
    dataUltimoProcessamento: dataUltimoProcessamento,
    status: status,
  };
}

function criarSnapshotHistorico(entidade, obj) {
  if (!obj) {
    return {
      valor: faker.number.float({ min: 5, max: 250, precision: 0.01 }),
      titulo: faker.commerce.productName(),
    };
  }

  const snapshot = {
    titulo: obj.titulo || obj.nome,
    valor: obj.valor ?? obj.saldo ?? obj.preco,
  };

  if (entidade === 'transacao' || entidade === 'salario') {
    snapshot.tipo = obj.tipo;
    snapshot.status = obj.status;
    snapshot.data = obj.data;
    snapshot.categoria = obj.categoria;
    snapshot.conta = obj.conta || null;
    snapshot.fonteSaldo = obj.fonteSaldo || 'conta';
    return snapshot;
  }

  if (entidade === 'conta') {
    snapshot.tipo = obj.tipo;
    snapshot.saldo = obj.saldo;
    snapshot.ativa = obj.ativa;
    return snapshot;
  }

  if (entidade === 'listaDesejo') {
    snapshot.preco = obj.preco;
    snapshot.valorEconomizado = obj.valorEconomizado;
    snapshot.categoria = obj.categoria;
  }

  return snapshot;
}

/**
 * Gera um histórico de ação
 */
function gerarHistorico(usuarioId, entidades) {
  const entidade = faker.helpers.arrayElement([
    'transacao',
    'conta',
    'carteira',
    'salario',
    'listaDesejo',
  ]);

  const acoesPorEntidade = {
    transacao: ['criacao', 'edicao', 'delecao'],
    conta: ['criacao', 'edicao', 'delecao', 'transferencia'],
    carteira: ['transferencia'],
    salario: ['criacao', 'edicao', 'delecao'],
    listaDesejo: ['criacao', 'edicao', 'delecao', 'realizacao'],
  };

  // Seleciona uma entidade existente aleatoriamente e pega seus dados
  let entidadeId, objetoReal;
  if (entidades[entidade] && entidades[entidade].length > 0) {
    objetoReal = faker.helpers.arrayElement(entidades[entidade]);
    entidadeId = objetoReal._id;
  } else {
    entidadeId = new mongoose.Types.ObjectId();
    objetoReal = null;
  }

  const acao = faker.helpers.arrayElement(
    acoesPorEntidade[entidade] || ['criacao']
  );

  const descricaoPadrao = formatarDescricaoHistoricoPadrao(acao, entidade);

  const snapshot = criarSnapshotHistorico(entidade, objetoReal);

  return {
    usuario: usuarioId,
    entidade: entidade,
    entidadeId: entidadeId,
    acao: acao,
    descricao: descricaoPadrao,
    dadosAnteriores: acao !== 'criacao' ? snapshot : null,
    dadosNovos: acao !== 'delecao' ? snapshot : null,
    metadata: {
      ip: faker.internet.ip(),
      userAgent: faker.internet.userAgent(),
    },
    desfeito: faker.datatype.boolean(0.1), // 10% de chance de estar desfeito
    desfeitoEm: faker.datatype.boolean(0.1)
      ? faker.date.recent({ days: 7 })
      : null,
  };
}

/**
 * Função principal para popular o banco de dados
 */
async function seedDatabase(options = {}) {
  const config = {
    ...DEFAULT_SEED_OPTIONS,
    ...options,
  };

  const {
    numContasPorUsuario,
    numTransacoesPorUsuario,
    numSalariosPorUsuario,
    numListaDesejoPorUsuario,
    numHistoricoPorUsuario,
    limparAntes,
    limparTudo,
    nomeUsuarioTeste = process.env.SEED_TEST_NAME || 'Usuário Teste',
    emailUsuarioTeste = process.env.SEED_TEST_EMAIL || 'teste@teste.com',
    senhaUsuarioTeste = process.env.SEED_TEST_PASSWORD || 'teste123',
  } = config;

  try {
    if (limparAntes) {
      await limparDadosSeed({ limparTudo, emailUsuarioTeste });
    }

    await garantirCategoriasPadrao();
    const categorias = await Categoria.find({ ativa: true });
    const categoriaSalario = await require('./categoriaHelpers').buscarSalario();

    const usuarioTeste = await obterOuAtualizarUsuarioTeste({
      nomeUsuarioTeste,
      emailUsuarioTeste,
      senhaUsuarioTeste,
    });

    const carteira = await Carteira.create(gerarCarteira(usuarioTeste._id));

    const contas = await criarEmLote(
      numContasPorUsuario,
      () => gerarConta(usuarioTeste._id),
      Conta
    );

    const transacoes = await criarEmLote(
      numTransacoesPorUsuario,
      () => {
        const contaAleatoria = faker.helpers.arrayElement(contas);
        return gerarTransacao(usuarioTeste._id, contaAleatoria._id, categorias);
      },
      Transacao
    );

    const salarios = categoriaSalario
      ? await criarEmLote(
          numSalariosPorUsuario,
          () => {
            const contaAleatoria = faker.helpers.arrayElement(contas);
            return gerarSalario(
              usuarioTeste._id,
              contaAleatoria._id,
              categoriaSalario
            );
          },
          Transacao
        )
      : [];

    const listaDesejos = await criarEmLote(
      numListaDesejoPorUsuario,
      () => gerarListaDesejo(usuarioTeste._id, categorias),
      ListaDesejo
    );

    const entidades = {
      transacao: transacoes,
      conta: contas,
      carteira: [carteira],
      listaDesejo: listaDesejos,
      salario: salarios,
    };

    await criarEmLote(
      numHistoricoPorUsuario,
      () => gerarHistorico(usuarioTeste._id, entidades),
      Historico
    );

    logger.info('Seed executado com sucesso', 'seedDB');
  } catch (error) {
    logger.error('Erro ao popular banco', 'seedDB', error);
    throw error;
  }
}

// Executar seed se for chamado diretamente
if (require.main === module) {
  require('dotenv').config();

  if (!process.env.MONGO_URL) {
    logger.error('MONGO_URL nao configurado no .env', 'seedDB');
    process.exit(1);
  }

  mongoose
    .connect(process.env.MONGO_URL)
    .then(() => {
      return seedDatabase(DEFAULT_SEED_OPTIONS);
    })
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Erro ao executar seed', 'seedDB', error);
      process.exit(1);
    });
}

module.exports = seedDatabase;
