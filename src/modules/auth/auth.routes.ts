import express from 'express';
import auth from '../../middlewares/auth.middleware.js';
import authorize from '../../middlewares/authorize.middleware.js';
import AuthController from './auth.controller.js';
import AuthService from './auth.service.js';

const routes = express.Router();

const authController = new AuthController(new AuthService());

routes
    .post('/register', auth, authorize, authController.register)
    .post('/login', authController.login)

export default routes;
