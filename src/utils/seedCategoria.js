const mongoose = require('mongoose');
const Categoria = require('../models/Categoria');
const Subcategoria = require('../models/Subcategoria');
const defaultCategories = require('../config/defaultCategories');
const { generateCategoryThemeFiles } = require('./categoryThemeGenerator');

// Função para garantir que categorias padrão existem no banco
async function garantirCategoriasPadrao() {
  const categorias = defaultCategories;

  const nomesPadrao = categorias.map((c) => c.nome);

  for (const cat of categorias) {
    const categoria = await Categoria.findOneAndUpdate(
      { nome: cat.nome },
      {
        $set: { cor: cat.cor, ativa: true },
        $setOnInsert: { nome: cat.nome },
      },
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
  await Categoria.updateMany(
    { nome: mongoose.trusted({ $nin: nomesPadrao }) },
    { ativa: false },
    { sanitizeFilter: false }
  );

  const categoriasAtuais = await Categoria.find({}, { cor: 1 }).lean();
  generateCategoryThemeFiles(categoriasAtuais);

  // log de confirmação
  // logger.info('Categorias e subcategorias padrao garantidas', 'seedCategoria');
}

module.exports = garantirCategoriasPadrao;
