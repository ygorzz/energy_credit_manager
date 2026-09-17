import 'dotenv/config';
import express from 'express';
import errorHandler from './middlewares/error-handler.js';
import authRoutes from './modules/Auth/auth.routes.js';
import distributorsRoutes from './modules/Distributors/distributors.routes.js';
import powerPlantsRoutes from './modules/Power-Plants/power-plants.routes.js';

const app = express();

app.use(express.json());
app.use('/auth', authRoutes);
app.use('/power-plants', powerPlantsRoutes);
app.use('/distributors', distributorsRoutes);
app.use(errorHandler);

export default app;

// middleware authorze para permitir ADMIN e ANALYST
// CRUD PowerPlants
// CRUD Users
