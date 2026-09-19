import "dotenv/config";
import express from "express";
import errorHandler from "./middlewares/error-handler.middleware.js";
import authRoutes from "./modules/Auth/auth.routes.js";
import distributorsRoutes from "./modules/Distributors/distributors.routes.js";
import powerPlantsRoutes from "./modules/Power-Plants/power-plants.routes.js";
import usersRoutes from "./modules/Users/users.routes.js";
import monthlyGenerationsRoutes from "./modules/Monthly-Generations/monthly-generations.routes.js";

const app = express();

app.use(express.json());
app.use("/auth", authRoutes);
app.use("/users", usersRoutes);
app.use("/distributors", distributorsRoutes);
app.use("/power-plants", powerPlantsRoutes);
app.use("/monthly-generations", monthlyGenerationsRoutes);
app.use(errorHandler);

export default app;

// CRUD Users
// Revisar possível separação de modules dentro de Auth module
