const express = require('express');
const router = express.Router();
const CarteiraController = require('../controllers/CarteiraController');
const autentication = require('../middlewares/autentication');
const asyncHandler = require('../middlewares/asyncHandler');
const { validateBody } = require('../middlewares/validateRequest');
const {
	carteiraAtualizarSaldoSchema,
	carteiraTransferenciaSchema,
} = require('../validation/financeSchemas');

const carteiraHandler = asyncHandler.controller(CarteiraController);

router.use(autentication);

// Obtém carteira do usuário
router.get('/', carteiraHandler('obter'));

// Atualiza saldo da carteira (entrada)
router.put('/', validateBody(carteiraAtualizarSaldoSchema), carteiraHandler('atualizarSaldo'));

// Transfere entre carteira e conta
router.post('/transferir', validateBody(carteiraTransferenciaSchema), carteiraHandler('transferir'));

module.exports = router;
