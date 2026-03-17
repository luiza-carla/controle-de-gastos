const express = require('express');
const router = express.Router();
const CategoriaController = require('../controllers/CategoriaController');
const SubcategoriaController = require('../controllers/SubcategoriaController');
const autenticacao = require('../middlewares/autentication');
const asyncHandler = require('../middlewares/asyncHandler');

router.get('/', autenticacao, asyncHandler(CategoriaController.listar));

router.get(
  '/:id/subcategorias',
  autenticacao,
  asyncHandler(SubcategoriaController.listarPorCategoria)
);

module.exports = router;
