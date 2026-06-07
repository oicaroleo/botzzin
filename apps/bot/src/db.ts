import type { PrismaClient } from '@prisma/client';

const getPrismaClient = (): typeof PrismaClient => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return require('@prisma/client').PrismaClient;
};

const prismaClientSingleton = () => {
  const Prisma = getPrismaClient();
  return new Prisma();
};

declare global {
  // eslint-disable-next-line no-var
  var prisma: ReturnType<typeof prismaClientSingleton> | undefined;
}

export const prisma = globalThis.prisma ?? prismaClientSingleton();

if (process.env.NODE_ENV !== 'production') globalThis.prisma = prisma;

export default prisma;
