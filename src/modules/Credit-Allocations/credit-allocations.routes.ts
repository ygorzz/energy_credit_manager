import express from "express";
import auth from "../../middlewares/auth.middleware.js";
import authorize from "../../middlewares/authorize.middleware.js";
import { UserRoles } from "../../db/generated/prisma/enums.js";
import CreditAllocationsController from "./credit-allocations.controller.js";
import CreditAllocationService from "./credit-allocation.service.js";
import * as rateLimit from "../../middlewares/rate-limit.middleware.js";

const routes = express.Router();

const creditAllocationsController = new CreditAllocationsController(
  new CreditAllocationService(),
);

routes
  .post(
    "/",
    rateLimit.creationLimiter,
    auth,
    authorize(UserRoles.ADMIN, UserRoles.ANALYST),
    creditAllocationsController.createCreditAllocation,
  )
  .get(
    "/",
    rateLimit.getLimiter,
    auth,
    authorize(UserRoles.ADMIN, UserRoles.ANALYST),
    creditAllocationsController.listcreditAllocations,
  )
  .get(
    "/:id",
    rateLimit.getLimiter,
    auth,
    authorize(UserRoles.ADMIN, UserRoles.ANALYST),
    creditAllocationsController.getCreditAllocationById,
  )
  .delete(
    "/:id",
    rateLimit.deleteLimiter,
    auth,
    authorize(UserRoles.ADMIN),
    creditAllocationsController.deleteCreditAllocation,
  )
  .patch(
    "/:id",
    rateLimit.updateLimiter,
    auth,
    authorize(UserRoles.ADMIN),
    creditAllocationsController.updateCreditAllocation,
  );

export default routes;
