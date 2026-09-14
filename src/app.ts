import 'dotenv/config';
import express from 'express';
import errorHandler from './middlewares/error-handler.js';
import authRoutes from './modules/auth/auth.routes.js';

const app = express();

app.use(express.json());
app.use('/auth', authRoutes);
app.use(errorHandler);

export default app;

// no login validar status do user, só liber se for active
