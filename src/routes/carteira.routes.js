const express = require('express');
const router = express.Router();
const CarteiraController = require('../controllers/CarteiraController');
const autentication = require('../middlewares/autentication');
const asyncHandler = require('../middlewares/asyncHandler');

const carteiraHandler = asyncHandler.controller(CarteiraController);

router.use(autentication);

// Obtém carteira do usuário
router.get('/', carteiraHandler('obter'));

// Atualiza saldo da carteira (entrada)
router.put('/', carteiraHandler('atualizarSaldo'));

// Transfere entre carteira e conta
router.post('/transferir', carteiraHandler('transferir'));

module.exports = router;
