const express = require('express');
const router = express.Router();
const HistoricoController = require('../controllers/HistoricoController');
const autenticacao = require('../middlewares/autentication');
const asyncHandler = require('../middlewares/asyncHandler');
const {
  validateParams,
  validateQuery,
} = require('../middlewares/validateRequest');
const {
  idParamsSchema,
  historicoEntidadeParamsSchema,
  historicoListagemQuerySchema,
} = require('../validation/financeSchemas');

const historicoHandler = asyncHandler.controller(HistoricoController);

router.use(autenticacao);

router.get(
  '/',
  validateQuery(historicoListagemQuerySchema),
  historicoHandler('listar')
);

router.get(
  '/:entidade/:entidadeId',
  validateParams(historicoEntidadeParamsSchema),
  historicoHandler('buscarPorEntidade')
);

router.post(
  '/:id/desfazer',
  validateParams(idParamsSchema),
  historicoHandler('desfazer')
);

module.exports = router;
