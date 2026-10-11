import express from 'express';
import { UserRoles } from '../../db/generated/prisma/enums.js';
import auth from '../../middlewares/auth.middleware.js';
import authorize from '../../middlewares/authorize.middleware.js';
import * as rateLimit from '../../middlewares/rate-limit.middleware.js';
import UserRepository from './user.repository.js';
import UserService from './user.service.js';
import UsersController from './users.controller.js';

const routes = express.Router();

const usersController = new UsersController(new UserService(new UserRepository()));

routes
  .get(
    '/',
    rateLimit.getLimiter,
    auth,
    authorize(UserRoles.ADMIN, UserRoles.ANALYST),
    usersController.listUsers,
  )
  .get(
    '/:id',
    rateLimit.getLimiter,
    auth,
    authorize(UserRoles.ADMIN, UserRoles.ANALYST),
    usersController.getUserById,
  )
  .delete(
    '/:id',
    rateLimit.deleteLimiter,
    auth,
    authorize(UserRoles.ADMIN),
    usersController.deleteUser,
  )
  .patch(
    '/:id',
    rateLimit.updateLimiter,
    auth,
    authorize(UserRoles.ADMIN),
    usersController.updateUser,
  );

export default routes;
