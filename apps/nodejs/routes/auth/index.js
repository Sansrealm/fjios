import express from 'express';
import credentialsSignin from './credentials-signin.js';
import signup from './signup.js';
import token from './token.js';
import verifyEmailRouter from './verify-email.js';
import sendVerifyEmail from './verify-email-send.js';
import forgotPassword from './forgot-password.js';
import resetPassword from './reset-password.js';
import deleteAccount from './delete-account.js';
import expoWebSuccess from './expo-web-success.js';
import milestones from './milestones.js';
import milestonesByUserId from './milestones-userId.js';

const router = express.Router();

router.post('/credentials-signin', credentialsSignin);
router.post('/signup', signup);
router.get('/token', token);
router.use('/verify-email', verifyEmailRouter);
router.post('/verify-email/send', sendVerifyEmail);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.delete('/delete-account', deleteAccount);
router.get('/expo-web-success', expoWebSuccess);
router.get('/milestones', milestones);
router.get('/milestones/:userId', milestonesByUserId);

export default router;

