import express from "express";
import UsersController from "./users.controller.js";
import UserService from "./user.service.js";
import auth from "../../middlewares/auth.middleware.js";
import authorize from "../../middlewares/authorize.middleware.js";
import { UserRoles } from "../../db/generated/prisma/enums.js";

const routes = express.Router();

const usersController = new UsersController(new UserService());

routes
  .get(
    "/",
    auth,
    authorize(UserRoles.ADMIN, UserRoles.ANALYST),
    usersController.listUsers,
  )
  .get(
    "/:id",
    auth,
    authorize(UserRoles.ADMIN, UserRoles.ANALYST),
    usersController.getUserById,
  )
  .delete("/:id", auth, authorize(UserRoles.ADMIN), usersController.deleteUser)
  .patch("/:id", auth, authorize(UserRoles.ADMIN), usersController.updateUser);

export default routes;
