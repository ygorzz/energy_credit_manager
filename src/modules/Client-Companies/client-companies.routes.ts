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

routes.post("/", auth, authorize(UserRoles.ADMIN), clientCompaniesController.createClientCompany);

export default routes;
