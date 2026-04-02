const express = require('express');
const router = express.Router();
const SalarioController = require('../controllers/SalarioController');
const autenticacao = require('../middlewares/autentication');
const asyncHandler = require('../middlewares/asyncHandler');

const salarioHandler = asyncHandler.controller(SalarioController);

router.post('/', autenticacao, salarioHandler('criar'));
router.get('/', autenticacao, salarioHandler('listar'));
router.put('/:id', autenticacao, salarioHandler('atualizar'));
router.delete('/:id', autenticacao, salarioHandler('deletar'));

module.exports = router;
