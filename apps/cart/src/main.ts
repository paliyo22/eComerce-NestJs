import { NestFactory } from '@nestjs/core';
import { CartModule } from './cart.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
      CartModule,
      {
        transport: Transport.TCP,
        options: { port: 3003 }
      }
    );
    await app.listen();
}
bootstrap();
