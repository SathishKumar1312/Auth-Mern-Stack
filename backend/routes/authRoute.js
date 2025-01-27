const express = require('express');
const authController = require('../controller/authController');
const verifyToken = require('../middleware/verifyToken');
const router = express.Router();

const {signup, login, logout, verifyEmail, forgotPassword, resetPassword, checkAuth} = authController;

router.get('/check-auth', verifyToken, checkAuth);

router.post('/signup', signup);

router.post('/verify-email', verifyEmail);

router.post('/login', login);

router.post('/logout', logout);

router.post('/forgot-password', forgotPassword);

router.post('/reset-password/:resetToken', resetPassword);


module.exports = router;