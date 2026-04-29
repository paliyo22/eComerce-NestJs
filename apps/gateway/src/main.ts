import { NestFactory } from '@nestjs/core';
import { GatewayModule } from './gateway.module';
import cookieParser from 'cookie-parser';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(GatewayModule);
  const config = app.get(ConfigService);
  app.useGlobalPipes(new ValidationPipe({whitelist: true, transform: true}));
  app.use(cookieParser());
  if(config.get<string>('NODE_ENV') === 'development'){
    app.enableCors({
      origin: true,
      credentials: true
    });
  }else{
    const rawOrigins = config.get<string>('ACCEPTED_ORIGINS');
    const origins = rawOrigins
      .split(',')
      .map(o => o.trim())
      .filter(o => o.length > 0);
    app.enableCors({
      origin: origins,
      credentials: true,
      allowedHeaders: 'Content-Type, Authorization',
      methods: 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
    });
  }
  await app.listen(config.get<number>('PORT'));
}
bootstrap();
