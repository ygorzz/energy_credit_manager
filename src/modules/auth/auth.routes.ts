import express from 'express';
import { UserRoles } from '../../db/generated/prisma/enums.js';
import auth from '../../middlewares/auth.middleware.js';
import authorize from '../../middlewares/authorize.middleware.js';
import * as rateLimit from '../../middlewares/rate-limit.middleware.js';
import UserRepository from '../Users/user.repository.js';
import AuthController from './auth.controller.js';
import AuthService from './auth.service.js';

const routes = express.Router();

const authController = new AuthController(new AuthService(new UserRepository()));

routes
  .post(
    '/register',
    rateLimit.creationLimiter,
    auth,
    authorize(UserRoles.ADMIN),
    authController.registerUser,
  )
  .post('/login', rateLimit.loginLimiter, authController.login);

export default routes;
