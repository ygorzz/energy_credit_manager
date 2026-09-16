import express from 'express';
import auth from '../../middlewares/auth.middleware.js';
import authorize from '../../middlewares/authorize.middleware.js';
import DistributorService from './distributor.service.js';
import DistributorsController from './distributors.controller.js';
import type { DistributorIdParams } from './distributors.types.js';

const routes = express.Router();

const distributorsController = new DistributorsController(new DistributorService());

routes
.post('/', auth, authorize, distributorsController.createDistributor)
// <DistributorIdParams> -> The routes params must agree to the controllers params
.delete<DistributorIdParams>('/:id', auth, authorize, distributorsController.deleteDistributor)
.patch<DistributorIdParams>('/:id', auth, authorize, distributorsController.updateDistributor)

export default routes;


