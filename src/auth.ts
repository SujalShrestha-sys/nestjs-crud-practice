import { existsSync } from 'node:fs';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { betterAuth } from 'better-auth';
import { PrismaService } from './lib/database/prisma.service';

if (existsSync('.env')) {
  process.loadEnvFile();
}

const baseURL = process.env.BETTER_AUTH_URL;

if (!baseURL) {
  throw new Error('BETTER_AUTH_URL must be set');
}

export const createAuth = (prisma: PrismaService) =>
  betterAuth({
    baseURL,
    trustedOrigins: [baseURL],
    // Render provides the visitor address through this forwarded header.
    // Better Auth uses it to apply its rate limits per client instead of
    // placing every request in one shared proxy bucket.
    advanced: {
      ipAddress: {
        ipAddressHeaders: ['x-forwarded-for'],
      },
    },
    database: prismaAdapter(prisma, {
      provider: 'postgresql',
    }),
    emailAndPassword: {
      enabled: true,
    },
    user: {
      additionalFields: {
        role: {
          type: ['PARTICIPANT', 'ADMIN'],
          required: false,
          defaultValue: 'PARTICIPANT',
          input: false,
        },
      },
    },
  });

export type Auth = ReturnType<typeof createAuth>;
