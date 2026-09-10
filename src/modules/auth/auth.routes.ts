import express from 'express';
import AuthController from './auth.controller.js';
import AuthService from './auth.service.js';

const routes = express.Router();

const authController = new AuthController(new AuthService());

routes
    .post('/register', authController.register)
    .post('/login', authController.login)

export default routes;


// seed no prisma para criar primerio user ADMIN - OK
// rota login - OK
// rota register
    // alterar nome rota register ??
