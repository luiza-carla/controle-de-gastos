const express = require('express');
const autenticacao = require('../middlewares/autentication');
const asyncHandler = require('../middlewares/asyncHandler');
const FaturaController = require('../controllers/FaturaController');

const router = express.Router();
const faturaHandler = asyncHandler.controller(FaturaController);

router.get('/', autenticacao, faturaHandler('listar'));

module.exports = router;
