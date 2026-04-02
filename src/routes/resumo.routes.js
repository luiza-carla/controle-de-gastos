const express = require('express');
const router = express.Router();

const ResumoController = require('../controllers/ResumoController');
const autenticacao = require('../middlewares/autentication');
const asyncHandler = require('../middlewares/asyncHandler');

const resumoHandler = asyncHandler.controller(ResumoController);

router.get('/', autenticacao, resumoHandler('obterResumo'));

router.get('/projecao', autenticacao, resumoHandler('obterProjecao'));

module.exports = router;
