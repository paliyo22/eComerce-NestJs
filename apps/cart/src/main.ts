import { NestFactory } from '@nestjs/core';
import { CartModule } from './cart.module';

async function bootstrap() {
  const app = await NestFactory.create(CartModule);
  await app.listen(process.env.port ?? 3000);
}
bootstrap();
