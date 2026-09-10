import bcrypt from 'bcrypt';
import { db } from '../src/db/prisma';

const hashPassword = await bcrypt.hash("Ygor1234", 10)

async function seed() {
  await db.user.create({
    data: {
      name: 'Ygor',
      email: 'y@y.com',
      hashPassword,
      role: 'ADMIN',
      status: 'ACTIVE',
    },
  });
  console.log('Database seeded');
  await db.$disconnect();
}

seed().catch((e) => {
  console.error(e);
  db.$disconnect();
  process.exit(1);
});
