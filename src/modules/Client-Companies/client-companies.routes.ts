import express from "express";
import ClientCompaniesController from "./client-companies.controller.js";
import ClientCompanyService from "./client-company.service.js";
import auth from "../../middlewares/auth.middleware.js";
import authorize from "../../middlewares/authorize.middleware.js";
import { UserRoles } from "../../db/generated/prisma/enums.js";

const routes = express.Router();

const clientCompaniesController = new ClientCompaniesController(
  new ClientCompanyService(),
);

routes
  .post(
    "/",
    auth,
    authorize(UserRoles.ADMIN),
    clientCompaniesController.createClientCompany,
  )
  .get(
    "/",
    auth,
    authorize(UserRoles.ADMIN, UserRoles.ANALYST),
    clientCompaniesController.listClientCompanies,
  )
  .get(
    "/:id",
    auth,
    authorize(UserRoles.ADMIN, UserRoles.ANALYST),
    clientCompaniesController.getClientCompanyById,
  )
  .delete(
    "/:id",
    auth,
    authorize(UserRoles.ADMIN),
    clientCompaniesController.deleteClientCompany,
  )
  .patch(
    "/:id",
    auth,
    authorize(UserRoles.ADMIN),
    clientCompaniesController.updateClientCompany,
  );

export default routes;
