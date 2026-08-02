import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bodyParser: false,
  });
  // Render terminates requests at a reverse proxy. Trust its single proxy hop
  // so Express exposes the client address as req.ip for Arcjet's IP-based rules.
  app.set('trust proxy', 1);

  const config = new DocumentBuilder()
    .setTitle('Hackathon Management API')
    .setDescription(
      'API documentation for Hackathon CRUD, user registrations, health monitoring, and project submissions.',
    )
    .setVersion('1.0')
    .addCookieAuth('better-auth.session_token')
    .addTag('Health', 'System and database status endpoint')
    .addTag('Hackathon', 'Hackathon management and participation endpoints')
    .addTag('User', 'User management and user profile endpoints')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  app.useGlobalFilters(new AllExceptionsFilter());
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

        return new BadRequestException({
          message: 'Validation failed',
          errors,
        });
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
