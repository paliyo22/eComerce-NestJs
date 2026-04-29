import { NestFactory } from '@nestjs/core';
import { ProductModule } from './product.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    ProductModule,
    {
      transport: Transport.RMQ,
      options: { 
        urls: ['amqp://rabbitmq:5672'],
        queue: 'product_queue'
      }
    }
  );
  await app.listen();
}
bootstrap();
