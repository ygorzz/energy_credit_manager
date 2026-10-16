import express from 'express';
import { UserRoles } from '../../db/generated/prisma/enums.js';
import auth from '../../middlewares/auth.middleware.js';
import authorize from '../../middlewares/authorize.middleware.js';
import * as rateLimit from '../../middlewares/rate-limit.middleware.js';
import ClientCompanyRepository from '../Client-Companies/client-company.repository.js';
import MonthlyDistributorBalanceRepository from '../Distributors/distributor-balance.repository.js';
import CreditAllocationRepository from './credit-allocation.repository.js';
import CreditAllocationService from './credit-allocation.service.js';
import CreditAllocationsController from './credit-allocations.controller.js';

const routes = express.Router();

const creditAllocationsController = new CreditAllocationsController(
  new CreditAllocationService(
    new CreditAllocationRepository(),
    new ClientCompanyRepository(),
    new MonthlyDistributorBalanceRepository(),
  ),
);

routes
  .post(
    '/',
    rateLimit.creationLimiter,
    auth,
    authorize(UserRoles.ADMIN, UserRoles.ANALYST),
    creditAllocationsController.createCreditAllocation,
  )
  .get(
    '/',
    rateLimit.getLimiter,
    auth,
    authorize(UserRoles.ADMIN, UserRoles.ANALYST),
    creditAllocationsController.listCreditAllocations,
  )
  .get(
    '/:id',
    rateLimit.getLimiter,
    auth,
    authorize(UserRoles.ADMIN, UserRoles.ANALYST),
    creditAllocationsController.getCreditAllocationById,
  )
  .delete(
    '/:id',
    rateLimit.deleteLimiter,
    auth,
    authorize(UserRoles.ADMIN),
    creditAllocationsController.deleteCreditAllocation,
  )
  .patch(
    '/:id',
    rateLimit.updateLimiter,
    auth,
    authorize(UserRoles.ADMIN),
    creditAllocationsController.updateCreditAllocation,
  );

export default routes;
