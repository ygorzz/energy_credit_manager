import express from 'express';
import { UserRoles } from '../../db/generated/prisma/enums.js';
import auth from '../../middlewares/auth.middleware.js';
import authorize from '../../middlewares/authorize.middleware.js';
import DistributorService from './distributor.service.js';
import DistributorsController from './distributors.controller.js';

const routes = express.Router();

const distributorsController = new DistributorsController(new DistributorService());

routes
  .get('/', auth, authorize(UserRoles.ADMIN, UserRoles.ANALYST), distributorsController.listDistributors)
  .get(
    '/:id',
    auth,
    authorize(UserRoles.ADMIN, UserRoles.ANALYST),
    distributorsController.getDistributorById,
  )
  .post(
    '/',
    auth,
    authorize(UserRoles.ADMIN, UserRoles.ANALYST),
    distributorsController.createDistributor,
  )
  .delete(
    '/:id',
    auth,
    authorize(UserRoles.ADMIN, UserRoles.ANALYST),
    distributorsController.deleteDistributor,
  )
  .patch(
    '/:id',
    auth,
    authorize(UserRoles.ADMIN, UserRoles.ANALYST),
    distributorsController.updateDistributor,
  );

export default routes;
