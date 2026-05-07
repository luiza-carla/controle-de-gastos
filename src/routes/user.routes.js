const express = require('express');
const router = express.Router();
const UserController = require('../controllers/UserController');
const autenticacao = require('../middlewares/autentication');
const asyncHandler = require('../middlewares/asyncHandler');
const { authRateLimit } = require('../middlewares/rateLimit');
const { validateBody } = require('../middlewares/validateRequest');
const {
  registrarSchema,
  loginSchema,
  alterarSenhaSchema,
  atualizarPreferenciasSchema,
} = require('../validation/userSchemas');

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
router.post(
  '/reativar-e-login',
  authRateLimit,
  validateBody(loginSchema),
  userHandler('reativarELogin')
);
router.get('/perfil', autenticacao, userHandler('perfil'));
router.get('/sessao', autenticacao, userHandler('sessao'));
router.put(
  '/preferencias',
  autenticacao,
  validateBody(atualizarPreferenciasSchema),
  userHandler('atualizarPreferencias')
);
router.put(
  '/alterar-senha',
  autenticacao,
  validateBody(alterarSenhaSchema),
  userHandler('alterarSenha')
);
router.patch('/desativar', autenticacao, userHandler('desativarConta'));
router.delete('/excluir', autenticacao, userHandler('excluirConta'));
router.post('/logout', userHandler('logout'));

module.exports = router;
