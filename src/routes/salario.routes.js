const express = require('express');
const router = express.Router();
const SalarioController = require('../controllers/SalarioController');
const autenticacao = require('../middlewares/autentication');
const asyncHandler = require('../middlewares/asyncHandler');
const {
  validateBody,
  validateParams,
} = require('../middlewares/validateRequest');
const {
  idParamsSchema,
  salarioCriacaoSchema,
  salarioAtualizacaoSchema,
} = require('../validation/financeSchemas');

const salarioHandler = asyncHandler.controller(SalarioController);

router.post(
  '/',
  autenticacao,
  validateBody(salarioCriacaoSchema),
  salarioHandler('criar')
);
router.get('/', autenticacao, salarioHandler('listar'));
router.put(
  '/:id',
  autenticacao,
  validateParams(idParamsSchema),
  validateBody(salarioAtualizacaoSchema),
  salarioHandler('atualizar')
);
router.delete(
  '/:id',
  autenticacao,
  validateParams(idParamsSchema),
  salarioHandler('deletar')
);

module.exports = router;
