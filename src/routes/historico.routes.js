const express = require('express');
const router = express.Router();
const HistoricoController = require('../controllers/HistoricoController');
const autenticacao = require('../middlewares/autentication');
const asyncHandler = require('../middlewares/asyncHandler');

const historicoHandler = asyncHandler.controller(HistoricoController);

router.use(autenticacao);

router.get('/', historicoHandler('listar'));

router.get('/:entidade/:entidadeId', historicoHandler('buscarPorEntidade'));

router.post('/:id/desfazer', historicoHandler('desfazer'));

router.delete('/limpar', historicoHandler('limparAntigo'));

module.exports = router;
