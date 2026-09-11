import 'dotenv/config';
import express from 'express';
import authRoutes from './modules/auth/auth.routes.js';

const app = express();

app.use(express.json());
app.use('/auth', authRoutes);

export default app;


// add tratamento de erros
// no login validar status do user, só liber se for active
