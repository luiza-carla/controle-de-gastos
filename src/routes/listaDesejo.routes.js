const express = require('express');
const router = express.Router();
const ListaDesejoController = require('../controllers/ListaDesejoController');
const autenticacao = require('../middlewares/autentication');
const asyncHandler = require('../middlewares/asyncHandler');
const {
  validateBody,
  validateParams,
  validateQuery,
} = require('../middlewares/validateRequest');
const {
  idParamsSchema,
  listaDesejoCriacaoSchema,
  listaDesejoAtualizacaoSchema,
  listaDesejoRealizarSchema,
  listagemOrdenadaQuerySchema,
} = require('../validation/financeSchemas');

const listaDesejoHandler = asyncHandler.controller(ListaDesejoController);

router.post(
  '/',
  autenticacao,
  validateBody(listaDesejoCriacaoSchema),
  listaDesejoHandler('criar')
);
router.get(
  '/',
  autenticacao,
  validateQuery(listagemOrdenadaQuerySchema),
  listaDesejoHandler('listar')
);
router.post(
  '/:id/realizar',
  autenticacao,
  validateParams(idParamsSchema),
  validateBody(listaDesejoRealizarSchema),
  listaDesejoHandler('realizar')
);
router.put(
  '/:id',
  autenticacao,
  validateParams(idParamsSchema),
  validateBody(listaDesejoAtualizacaoSchema),
  listaDesejoHandler('atualizar')
);
router.delete(
  '/:id',
  autenticacao,
  validateParams(idParamsSchema),
  listaDesejoHandler('deletar')
);

module.exports = router;
