const express = require('express');
const router = express.Router();
const UserController = require('../controllers/UserController');
const asyncHandler = require('../middlewares/asyncHandler');

const userHandler = asyncHandler.controller(UserController);

router.post('/registrar', userHandler('registrar'));
router.post('/login', userHandler('login'));

module.exports = router;
