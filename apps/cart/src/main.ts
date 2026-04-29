import { NestFactory } from '@nestjs/core';
import { CartModule } from './cart.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
      CartModule,
      {
      transport: Transport.RMQ,
      options: { 
        urls: ['amqp://rabbitmq:5672'],
        queue: 'cart_queue'
      }
    }
    );
    await app.listen();
}
bootstrap();
