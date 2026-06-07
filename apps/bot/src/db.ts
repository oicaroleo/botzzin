import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { PrismaClient } = require('@prisma/client');

const prismaClientSingleton = () => {
  return new PrismaClient();
};

declare global {
  // eslint-disable-next-line no-var
  var prisma: ReturnType<typeof prismaClientSingleton> | undefined;
}

export const prisma = globalThis.prisma ?? prismaClientSingleton();

if (process.env.NODE_ENV !== 'production') globalThis.prisma = prisma;

export default prisma;
