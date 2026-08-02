import { existsSync } from 'node:fs';
import { ArcjetGuard, ArcjetModule, shield, slidingWindow } from '@arcjet/nest';
import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AuthModule } from '@thallesp/nestjs-better-auth';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { createAuth } from './auth';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { PrismaModule } from './lib/database/prisma.module';
import { PrismaService } from './lib/database/prisma.service';
import { UserModule } from './module/user/user.module';
import { HackathonModule } from './module/hackathon/hackathon.module';
import { HealthModule } from './module/health/health.module';
import { SubmissionModule } from './module/submission/submission.module';

if (existsSync('.env')) {
  process.loadEnvFile();
}

const arcjetKey = process.env.ARCJET_KEY;

if (!arcjetKey) {
  throw new Error('ARCJET_KEY must be set');
}

const arcjetMode = process.env.ARCJET_MODE === 'LIVE' ? 'LIVE' : 'DRY_RUN';

@Module({
  imports: [
    PrismaModule,
    UserModule,
    HealthModule,
    SubmissionModule,
    AuthModule.forRootAsync({
      imports: [PrismaModule],
      inject: [PrismaService],
      useFactory: (prisma: PrismaService) => ({
        auth: createAuth(prisma),
      }),
    }),
    ArcjetModule.forRoot({
      isGlobal: true,
      key: arcjetKey,
      rules: [
        shield({ mode: arcjetMode }),
        slidingWindow({
          mode: arcjetMode,
          max: 100,
          interval: '1m',
        }),
      ],
    }),
    HackathonModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    ResponseInterceptor,
    {
      provide: APP_GUARD,
      useClass: ArcjetGuard,
    },
  ],
})
export class AppModule {}
