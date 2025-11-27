import { NestFactory } from '@nestjs/core';
import { OrderModule } from './order.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
      OrderModule,
      {
        transport: Transport.TCP,
        options: { port: 3004 }
      }
    );
    await app.listen();
}
bootstrap();
