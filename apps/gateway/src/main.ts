import { NestFactory } from '@nestjs/core';
import { GatewayModule } from './gateway.module';
import * as cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(GatewayModule);
  app.use(cookieParser());
  const rawOrigins = process.env.ACCEPTED_ORIGINS ?? '';
  const origins = rawOrigins
    .split(',')
    .map(o => o.trim())
    .filter(o => o.length > 0);
  app.enableCors({
    origin: origins,
    credentials: true,
    allowedHeaders: 'Content-Type, Authorization',
    methods: 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
  })
  await app.listen(process.env.port ?? 3000);
}
bootstrap();
