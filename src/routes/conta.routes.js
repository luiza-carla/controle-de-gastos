const express = require('express');
const router = express.Router();
const ContaController = require('../controllers/ContaController');
const autenticacao = require('../middlewares/autentication');
const asyncHandler = require('../middlewares/asyncHandler');

const contaHandler = asyncHandler.controller(ContaController);

router.post('/', autenticacao, contaHandler('criar'));
router.get('/', autenticacao, contaHandler('listar'));
router.put('/:id', autenticacao, contaHandler('atualizar'));
router.delete('/:id', autenticacao, contaHandler('deletar'));
router.post('/:id/transferir', autenticacao, contaHandler('transferir'));

module.exports = router;
