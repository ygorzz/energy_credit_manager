import "dotenv/config";
import express from "express";
import errorHandler from "./middlewares/error-handler.middleware.js";
import authRoutes from "./modules/Auth/auth.routes.js";
import distributorsRoutes from "./modules/Distributors/distributors.routes.js";
import powerPlantsRoutes from "./modules/Power-Plants/power-plants.routes.js";
import usersRoutes from "./modules/Users/users.routes.js";
import monthlyGenerationsRoutes from "./modules/Monthly-Generations/monthly-generations.routes.js";
import clientCompaniesRoutes from "./modules/Client-Companies/client-companies.routes.js";
import creaditAllocationnRoutes from "./modules/Credit-Allocations/credit-allocations.routes.js";

const app = express();

app.use(express.json());
app.use("/auth", authRoutes);
app.use("/users", usersRoutes);
app.use("/distributors", distributorsRoutes);
app.use("/power-plants", powerPlantsRoutes);
app.use("/monthly-generations", monthlyGenerationsRoutes);
app.use("/client-companies", clientCompaniesRoutes);
app.use("/credit-allocations", creaditAllocationnRoutes);
app.use(errorHandler);

export default app;

// REGRAS DE NEGÓCIO A APLICAR:
// Fortalecer validação do cnpj e criar a validação da estrutura matemática no service
// Ao criar um credit allocation, verificar se é percentageApplied e energyAllocated são possiveis de acordo com a quantidade de geração ainda disponível
