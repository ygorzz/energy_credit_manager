import express from 'express';
import auth from '../../middlewares/auth.middleware.js';
import authorize from '../../middlewares/authorize.middleware.js';
import DistributorService from './distributor.service.js';
import DistributorsController from './distributors.controller.js';

const routes = express.Router();

const distributorsController = new DistributorsController(new DistributorService());

routes
.get('/', auth, authorize, distributorsController.listDistributors)
.get('/:id', auth, authorize, distributorsController.getDistributorById)
.post('/', auth, authorize, distributorsController.createDistributor)
.delete('/:id', auth, authorize, distributorsController.deleteDistributor)
.patch('/:id', auth, authorize, distributorsController.updateDistributor)

export default routes;


