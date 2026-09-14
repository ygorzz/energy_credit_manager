import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { env } from '../config/env.js';
import { PrismaClient } from './generated/prisma/client.js';

const connectionString = `${env.DATABASE_URL}`;

// Prisma trabalha com adapters para se vincular ao BD - nesse caso, usamos o adapter do postregsql
const adapter = new PrismaPg({ connectionString });
const db = new PrismaClient({ adapter });

export { db };
