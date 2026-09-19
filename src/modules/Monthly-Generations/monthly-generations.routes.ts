import express from "express";
import { UserRoles } from "../../db/generated/prisma/enums.js";
import auth from "../../middlewares/auth.middleware.js";
import authorize from "../../middlewares/authorize.middleware.js";
import MonthlyGenerationService from "./monthly-generation.service.js";
import MonthlyGenerationsController from "./monthly-generations.controller.js";

const routes = express.Router();

const monthlyGenerationsController = new MonthlyGenerationsController(
  new MonthlyGenerationService(),
);

routes
  .get(
    "/",
    auth,
    authorize(UserRoles.ADMIN, UserRoles.ANALYST),
    monthlyGenerationsController.listMonthlyGenerations,
  )
  .get(
    "/:id",
    auth,
    authorize(UserRoles.ADMIN, UserRoles.ANALYST),
    monthlyGenerationsController.getMonthlyGenerationById,
  )
  .post(
    "/",
    auth,
    authorize(UserRoles.ADMIN),
    monthlyGenerationsController.createMonthlyGeneration,
  )
  .delete(
    "/:id",
    auth,
    authorize(UserRoles.ADMIN),
    monthlyGenerationsController.deleteMonthlyGeneration,
  )
  .patch(
    "/:id",
    auth,
    authorize(UserRoles.ADMIN),
    monthlyGenerationsController.updateMonthlyGeneration,
  );

export default routes;
