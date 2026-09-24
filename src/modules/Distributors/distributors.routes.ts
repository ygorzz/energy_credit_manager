import express from "express";
import { UserRoles } from "../../db/generated/prisma/enums.js";
import auth from "../../middlewares/auth.middleware.js";
import authorize from "../../middlewares/authorize.middleware.js";
import DistributorService from "./distributor.service.js";
import DistributorsController from "./distributors.controller.js";
import * as rateLimit from "../../middlewares/rate-limit.middleware.js";

const routes = express.Router();

const distributorsController = new DistributorsController(
  new DistributorService(),
);

routes
  .get(
    "/",
    rateLimit.getLimiter,
    auth,
    authorize(UserRoles.ADMIN, UserRoles.ANALYST),
    distributorsController.listDistributors,
  )
  .get(
    "/:id",
    rateLimit.getLimiter,
    auth,
    authorize(UserRoles.ADMIN, UserRoles.ANALYST),
    distributorsController.getDistributorById,
  )
  .post(
    "/",
    rateLimit.creationLimiter,
    auth,
    authorize(UserRoles.ADMIN),
    distributorsController.createDistributor,
  )
  .delete(
    "/:id",
    rateLimit.deleteLimiter,
    auth,
    authorize(UserRoles.ADMIN),
    distributorsController.deleteDistributor,
  )
  .patch(
    "/:id",
    rateLimit.updateLimiter,
    auth,
    authorize(UserRoles.ADMIN),
    distributorsController.updateDistributor,
  );

export default routes;
