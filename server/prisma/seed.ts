import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const password = process.env.ADMIN_PASSWORD ?? '';

if (password.length < 8) {
  console.error('ADMIN_PASSWORD manquant ou trop court (8 caractères minimum) dans .env');
  process.exit(1);
}

(async () => {
  await prisma.user.upsert({
    where: { matricule: 'ADMIN' },
    update: {},
    create: {
      matricule: 'ADMIN',
      nom: 'Administrateur',
      role: 'ADMIN',
      doitChangerMdp: false,
      passwordHash: await bcrypt.hash(password, 10),
    },
  });
  console.log('Compte administrateur prêt (matricule : ADMIN)');
})().finally(() => prisma.$disconnect());
