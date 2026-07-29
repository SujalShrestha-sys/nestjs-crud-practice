import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bodyParser: false,
  });
  // Render terminates requests at a reverse proxy. Trust its single proxy hop
  // so Express exposes the client address as req.ip for Arcjet's IP-based rules.
  app.set('trust proxy', 1);
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      exceptionFactory: (validationErrors) => {
        const errors = validationErrors.flatMap(({ property, constraints }) =>
          Object.values(constraints ?? {}).map((message) => ({
            property,
            message,
          })),
        );

        return new BadRequestException(errors);
      },
    }),
  );
  app.useGlobalInterceptors(app.get(ResponseInterceptor));
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap().catch((error: unknown) => {
  console.error('Failed to start the application', error);
  process.exit(1);
});
