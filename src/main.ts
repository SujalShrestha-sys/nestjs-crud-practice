import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bodyParser: false,
  });
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
bootstrap();
