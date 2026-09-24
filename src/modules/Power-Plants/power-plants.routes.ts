import express from "express";
import auth from "../../middlewares/auth.middleware.js";
import PowerPlantService from "./power-plant.service.js";
import PowerPlantsController from "./power-plants.controller.js";
import authorize from "../../middlewares/authorize.middleware.js";
import { UserRoles } from "../../db/generated/prisma/enums.js";
import * as rateLimit from "../../middlewares/rate-limit.middleware.js";

const routes = express.Router();

const powerPlantsController = new PowerPlantsController(
  new PowerPlantService(),
);

routes
  .get(
    "/",
    rateLimit.getLimiter,
    auth,
    authorize(UserRoles.ADMIN, UserRoles.ANALYST),
    powerPlantsController.listPowerPlants,
  )
  .get(
    "/:id",
    rateLimit.getLimiter,
    auth,
    authorize(UserRoles.ADMIN, UserRoles.ANALYST),
    powerPlantsController.getPowerPlantById,
  )
  .post(
    "/",
    rateLimit.creationLimiter,
    auth,
    authorize(UserRoles.ADMIN),
    powerPlantsController.createPowerPlant,
  )
  .delete(
    "/:id",
    rateLimit.deleteLimiter,
    auth,
    authorize(UserRoles.ADMIN),
    powerPlantsController.deletePowerPlant,
  )
  .patch(
    "/:id",
    rateLimit.updateLimiter,
    auth,
    authorize(UserRoles.ADMIN),
    powerPlantsController.updatePowerPlant,
  );
export default routes;
