import express from "express";
import { UserRoles } from "../../db/generated/prisma/enums.js";
import auth from "../../middlewares/auth.middleware.js";
import authorize from "../../middlewares/authorize.middleware.js";
import MonthlyGenerationService from "./monthly-generation.service.js";
import MonthlyGenerationsController from "./monthly-generations.controller.js";
import * as rateLimit from "../../middlewares/rate-limit.middleware.js";

const routes = express.Router();

const monthlyGenerationsController = new MonthlyGenerationsController(
  new MonthlyGenerationService(),
);

routes
  .get(
    "/",
    rateLimit.getLimiter,
    auth,
    authorize(UserRoles.ADMIN, UserRoles.ANALYST),
    monthlyGenerationsController.listMonthlyGenerations,
  )
  .get(
    "/:id",
    rateLimit.getLimiter,
    auth,
    authorize(UserRoles.ADMIN, UserRoles.ANALYST),
    monthlyGenerationsController.getMonthlyGenerationById,
  )
  .post(
    "/",
    rateLimit.creationLimiter,
    auth,
    authorize(UserRoles.ADMIN),
    monthlyGenerationsController.createMonthlyGeneration,
  )
  .delete(
    "/:id",
    rateLimit.deleteLimiter,
    auth,
    authorize(UserRoles.ADMIN),
    monthlyGenerationsController.deleteMonthlyGeneration,
  )
  .patch(
    "/:id",
    rateLimit.updateLimiter,
    auth,
    authorize(UserRoles.ADMIN),
    monthlyGenerationsController.updateMonthlyGeneration,
  );

export default routes;
