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
    ? [
        'https://test.freeq.cl',
        'http://localhost:3001',
        'http://192.168.1.84:3001',
        'localhost:3001',
      ]
    : ['https://freeq.cl'];

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
