const express = require('express');
const router = express.Router();
const UserController = require('../controllers/UserController');
const autenticacao = require('../middlewares/autentication');
const asyncHandler = require('../middlewares/asyncHandler');
const { authRateLimit } = require('../middlewares/rateLimit');
const { validateBody } = require('../middlewares/validateRequest');
const { registrarSchema, loginSchema } = require('../validation/userSchemas');

const userHandler = asyncHandler.controller(UserController);

router.post(
  '/registrar',
  authRateLimit,
  validateBody(registrarSchema),
  userHandler('registrar')
);
router.post(
  '/login',
  authRateLimit,
  validateBody(loginSchema),
  userHandler('login')
);
router.get('/sessao', autenticacao, userHandler('sessao'));
router.post('/logout', userHandler('logout'));

module.exports = router;
