import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcrypt';
import { PrismaClient } from '../src/db/generated/prisma/client.js';
import { registerUserSchema } from '../src/modules/Users/user.dto.js';

async function seed() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('Missing database configuration');

  const email = registerUserSchema.shape.email.parse(process.env.BOOTSTRAP_ADMIN_EMAIL);
  // Bootstrap owns its connection and does not depend on API authentication settings.
  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

  try {
    const existing = await db.user.findUnique({ where: { email } });
    if (existing) {
      // Repeated runs preserve passwords/status and never promote accounts with another role.
      if (existing.role !== 'ADMIN') throw new Error('Bootstrap account is not an administrator');
      console.log('Administrator already exists; no changes made.');
      return;
    }

    // The bootstrap password is required only when creating the administrator.
    const { password, ...data } = registerUserSchema.parse({
      name: process.env.BOOTSTRAP_ADMIN_NAME ?? 'Administrator',
      email,
      password: process.env.BOOTSTRAP_ADMIN_PASSWORD,
      role: 'ADMIN',
      status: 'ACTIVE',
      companyId: null,
    });
    const hashPassword = await bcrypt.hash(password, 10);
    const admin = await db.user.upsert({
      where: { email },
      // Using upsert with update and create -> Concurrent bootstrap runs must not overwrite an existing account.
      update: {},
      create: { ...data, hashPassword },
    });
    if (admin.role !== 'ADMIN') throw new Error('Bootstrap account is not an administrator');
    console.log('Administrator bootstrap completed.');
  } finally {
    await db.$disconnect();
  }
}

// Catches any error threw by seed function
seed().catch(() => {
  // Report invalid configuration without exposing passwords or connection details.
  console.error(
    'Administrator bootstrap failed. Check DATABASE_URL, BOOTSTRAP_ADMIN_EMAIL, ' +
      'BOOTSTRAP_ADMIN_NAME and BOOTSTRAP_ADMIN_PASSWORD; an existing account must already be ADMIN.',
  );
  process.exitCode = 1;
});
