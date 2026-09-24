import express from "express";
import { UserRoles } from "../../db/generated/prisma/enums.js";
import auth from "../../middlewares/auth.middleware.js";
import authorize from "../../middlewares/authorize.middleware.js";
import AuthController from "./auth.controller.js";
import AuthService from "./auth.service.js";
import * as rateLimit from "../../middlewares/rate-limit.middleware.js";

const routes = express.Router();

const authController = new AuthController(new AuthService());

routes
  .post(
    "/register",
    rateLimit.creationLimiter,
    auth,
    authorize(UserRoles.ADMIN),
    authController.register,
  )
  .post("/login", rateLimit.loginLimiter, authController.login);

export default routes;
