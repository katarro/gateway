import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import { envs } from './config/envs';
import * as cookieParser from 'cookie-parser';

async function bootstrap() {
  const logger = new Logger('Main Gateway');
  const app = await NestFactory.create(AppModule);

  const isDevelopment = envs.environment === 'development';
  const corsOrigin = isDevelopment
    ? 'http://localhost:5500'
    : 'https://freeq.cl';

  app.enableCors({
    origin: corsOrigin,
    credentials: true,
  });

  app.use(cookieParser());
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  await app.listen(envs.port);
  logger.log(`Corriendo en el puerto ${envs.port} `);
}

bootstrap();
