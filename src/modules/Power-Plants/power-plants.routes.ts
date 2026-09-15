import express from 'express';
import auth from '../../middlewares/auth.middleware.js';
import PowerPlantService from './power-plant.service.js';
import PowerPlantsController from './power-plants.controller.js';

const routes = express.Router();

const powerPlantsController = new PowerPlantsController(new PowerPlantService());

routes.post('/', auth, powerPlantsController.createPowerPlant);

export default routes;
