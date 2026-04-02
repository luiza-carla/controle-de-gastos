const express = require('express');
const router = express.Router();
const ListaDesejoController = require('../controllers/ListaDesejoController');
const autenticacao = require('../middlewares/autentication');
const asyncHandler = require('../middlewares/asyncHandler');

const listaDesejoHandler = asyncHandler.controller(ListaDesejoController);

router.post('/', autenticacao, listaDesejoHandler('criar'));
router.get('/', autenticacao, listaDesejoHandler('listar'));
router.post('/:id/realizar', autenticacao, listaDesejoHandler('realizar'));
router.put('/:id', autenticacao, listaDesejoHandler('atualizar'));
router.delete('/:id', autenticacao, listaDesejoHandler('deletar'));

module.exports = router;
