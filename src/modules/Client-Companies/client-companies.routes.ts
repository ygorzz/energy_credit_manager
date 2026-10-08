import express from 'express';
import { UserRoles } from '../../db/generated/prisma/enums.js';
import auth from '../../middlewares/auth.middleware.js';
import authorize from '../../middlewares/authorize.middleware.js';
import * as rateLimit from '../../middlewares/rate-limit.middleware.js';
import ClientCompaniesController from './client-companies.controller.js';
import ClientCompanyRepository from './client-company.repository.js';
import ClientCompanyService from './client-company.service.js';

const routes = express.Router();

const clientCompaniesController = new ClientCompaniesController(
  new ClientCompanyService(new ClientCompanyRepository()),
);

routes
  .post(
    '/',
    rateLimit.creationLimiter,
    auth,
    authorize(UserRoles.ADMIN),
    clientCompaniesController.createClientCompany,
  )
  .get(
    '/',
    rateLimit.getLimiter,
    auth,
    authorize(UserRoles.ADMIN, UserRoles.ANALYST),
    clientCompaniesController.listClientCompanies,
  )
  .get(
    '/:id',
    rateLimit.getLimiter,
    auth,
    authorize(UserRoles.ADMIN, UserRoles.ANALYST),
    clientCompaniesController.getClientCompanyById,
  )
  .delete(
    '/:id',
    rateLimit.deleteLimiter,
    auth,
    authorize(UserRoles.ADMIN),
    clientCompaniesController.deleteClientCompany,
  )
  .patch(
    '/:id',
    rateLimit.updateLimiter,
    auth,
    authorize(UserRoles.ADMIN),
    clientCompaniesController.updateClientCompany,
  );

export default routes;
