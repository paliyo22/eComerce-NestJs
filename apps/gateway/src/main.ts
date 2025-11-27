import { NestFactory } from '@nestjs/core';
import { GatewayModule } from './gateway.module';
import cookieParser from 'cookie-parser';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(GatewayModule);
  app.useGlobalPipes(new ValidationPipe())
  app.use(cookieParser());
  app.enableCors({
    origin: true, // o tu dominio del frontend
    credentials: true
  });

  /*const rawOrigins = process.env.ACCEPTED_ORIGINS ?? '';
  const origins = rawOrigins
    .split(',')
    .map(o => o.trim())
    .filter(o => o.length > 0);
  app.enableCors({
    origin: origins,
    credentials: true,
    allowedHeaders: 'Content-Type, Authorization',
    methods: 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
  })*/
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
