const express = require('express');
const router = express.Router();
const CategoriaController = require('../controllers/CategoriaController');
const SubcategoriaController = require('../controllers/SubcategoriaController');
const autenticacao = require('../middlewares/autentication');
const asyncHandler = require('../middlewares/asyncHandler');

const categoriaHandler = asyncHandler.controller(CategoriaController);
const subcategoriaHandler = asyncHandler.controller(SubcategoriaController);

router.get('/', autenticacao, categoriaHandler('listar'));

router.get(
  '/:id/subcategorias',
  autenticacao,
  subcategoriaHandler('listarPorCategoria')
);

module.exports = router;
