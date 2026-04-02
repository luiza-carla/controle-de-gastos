const express = require('express');
const router = express.Router();
const TransacaoController = require('../controllers/TransacaoController');
const autenticacao = require('../middlewares/autentication');
const asyncHandler = require('../middlewares/asyncHandler');

const transacaoHandler = asyncHandler.controller(TransacaoController);

router.post('/', autenticacao, transacaoHandler('criar'));
router.get('/', autenticacao, transacaoHandler('listar'));
router.put('/:id', autenticacao, transacaoHandler('atualizar'));
router.delete('/:id', autenticacao, transacaoHandler('deletar'));

module.exports = router;
