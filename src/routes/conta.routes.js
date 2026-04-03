const express = require('express');
const router = express.Router();
const ContaController = require('../controllers/ContaController');
const autenticacao = require('../middlewares/autentication');
const asyncHandler = require('../middlewares/asyncHandler');
const {
  validateBody,
  validateParams,
} = require('../middlewares/validateRequest');
const {
  idParamsSchema,
  contaCriacaoSchema,
  contaAtualizacaoSchema,
  contaTransferenciaSchema,
} = require('../validation/financeSchemas');

const contaHandler = asyncHandler.controller(ContaController);

router.post(
  '/',
  autenticacao,
  validateBody(contaCriacaoSchema),
  contaHandler('criar')
);
router.get('/', autenticacao, contaHandler('listar'));
router.put(
  '/:id',
  autenticacao,
  validateParams(idParamsSchema),
  validateBody(contaAtualizacaoSchema),
  contaHandler('atualizar')
);
router.delete(
  '/:id',
  autenticacao,
  validateParams(idParamsSchema),
  contaHandler('deletar')
);
router.post(
  '/:id/transferir',
  autenticacao,
  validateParams(idParamsSchema),
  validateBody(contaTransferenciaSchema),
  contaHandler('transferir')
);

module.exports = router;
