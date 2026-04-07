const express = require('express');
const router = express.Router();
const TransacaoController = require('../controllers/TransacaoController');
const autenticacao = require('../middlewares/autentication');
const asyncHandler = require('../middlewares/asyncHandler');
const {
  validateBody,
  validateParams,
  validateQuery,
} = require('../middlewares/validateRequest');
const {
  idParamsSchema,
  transacaoCriacaoSchema,
  transacaoAtualizacaoSchema,
  listagemOrdenadaQuerySchema,
} = require('../validation/financeSchemas');

const transacaoHandler = asyncHandler.controller(TransacaoController);

router.post(
  '/',
  autenticacao,
  validateBody(transacaoCriacaoSchema),
  transacaoHandler('criar')
);
router.get(
  '/',
  autenticacao,
  validateQuery(listagemOrdenadaQuerySchema),
  transacaoHandler('listar')
);
router.put(
  '/:id',
  autenticacao,
  validateParams(idParamsSchema),
  validateBody(transacaoAtualizacaoSchema),
  transacaoHandler('atualizar')
);
router.delete(
  '/:id',
  autenticacao,
  validateParams(idParamsSchema),
  transacaoHandler('deletar')
);

module.exports = router;
