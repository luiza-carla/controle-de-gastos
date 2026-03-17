const Categoria = require('../models/Categoria');
const Subcategoria = require('../models/Subcategoria');

// Função para garantir que categorias padrão existem no banco
async function garantirCategoriasPadrao() {
  const categorias = [
    {
      nome: 'Renda',
      cor: '#2ecc71',
      subcategorias: [
        'Salário',
        'Freelance',
        'Comissão',
        'Bônus',
        'Venda',
        'Investimentos',
        'Presente recebido',
        'Reembolso',
      ],
    },
    {
      nome: 'Moradia',
      cor: '#e74c3c',
      subcategorias: [
        'Aluguel',
        'Financiamento',
        'Condomínio',
        'Conta de luz',
        'Conta de água',
        'Conta de gás',
        'Internet',
        'Manutenção da casa',
        'Móveis',
        'Decoração',
      ],
    },
    {
      nome: 'Alimentação',
      cor: '#f39c12',
      subcategorias: [
        'Mercado',
        'Restaurante',
        'Delivery',
        'Padaria',
        'Café',
        'Lanche',
      ],
    },
    {
      nome: 'Transporte',
      cor: '#2980b9',
      subcategorias: [
        'Combustível',
        'Transporte público',
        'Transporte por aplicativo',
        'Estacionamento',
        'Manutenção do veículo',
        'Seguro do veículo',
        'Pedágio',
      ],
    },
    {
      nome: 'Saúde',
      cor: '#e84393',
      subcategorias: [
        'Plano de saúde',
        'Consulta médica',
        'Exames',
        'Medicamentos',
        'Academia',
        'Terapia',
        'Odontologia',
      ],
    },
    {
      nome: 'Educação',
      cor: '#8e44ad',
      subcategorias: [
        'Faculdade',
        'Curso',
        'Livro',
        'Material de estudo',
        'Idiomas',
      ],
    },
    {
      nome: 'Lazer e entretenimento',
      cor: '#00bcd4',
      subcategorias: [
        'Cinema',
        'Streaming',
        'Jogos',
        'Viagem',
        'Passeios',
        'Shows / eventos',
        'Hobbies',
      ],
    },
    {
      nome: 'Compras',
      cor: '#ff9800',
      subcategorias: [
        'Roupa',
        'Calçado',
        'Acessórios',
        'Eletrônicos',
        'Acessórios eletrônicos',
        'Compra online',
        'Papelaria',
      ],
    },
    {
      nome: 'Beleza e cuidados pessoais',
      cor: '#ff4fa3',
      subcategorias: [
        'Maquiagem',
        'Skincare',
        'Perfume',
        'Produtos de cabelo',
        'Salão de beleza',
        'Manicure / pedicure',
        'Estética',
      ],
    },
    {
      nome: 'Pets',
      cor: '#16a085',
      subcategorias: [
        'Ração',
        'Veterinário',
        'Higiene pet',
        'Brinquedos pet',
        'Acessórios pet',
      ],
    },
    {
      nome: 'Finanças',
      cor: '#34495e',
      subcategorias: [
        'Cartão de crédito',
        'Empréstimos',
        'Juros',
        'Tarifas bancárias',
        'Impostos',
        'Seguros',
      ],
    },
    {
      nome: 'Presentes e doações',
      cor: '#f06292',
      subcategorias: ['Presente dado', 'Doação', 'Caridade'],
    },
    {
      nome: 'Outros',
      cor: '#7f8c8d',
      subcategorias: ['Imprevisto', 'Taxas diversas', 'Outros'],
    },
  ];

  const nomesPadrao = categorias.map((c) => c.nome);

  for (const cat of categorias) {
    const categoria = await Categoria.findOneAndUpdate(
      { nome: cat.nome },
      { $setOnInsert: { nome: cat.nome, cor: cat.cor } },
      { upsert: true, returnDocument: 'after' }
    );

    // garante subcategorias associadas
    if (Array.isArray(cat.subcategorias)) {
      for (const sub of cat.subcategorias) {
        await Subcategoria.updateOne(
          { nome: sub, categoria: categoria._id },
          { $setOnInsert: { nome: sub, categoria: categoria._id } },
          { upsert: true }
        );
      }
    }
  }

  // desativa categorias que não estão na lista padrão
  await Categoria.updateMany({ nome: { $nin: nomesPadrao } }, { ativa: false });

  // log de confirmação
  // logger.info('Categorias e subcategorias padrao garantidas', 'seedCategoria');
}

module.exports = garantirCategoriasPadrao;
