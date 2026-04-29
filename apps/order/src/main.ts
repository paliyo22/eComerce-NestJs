import { NestFactory } from '@nestjs/core';
import { OrderModule } from './order.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
      OrderModule,
      {
        transport: Transport.RMQ,
        options: { 
          urls: ['amqp://rabbitmq:5672'],
          queue: 'order_queue'
        }
      }
    );
    await app.listen();
}
bootstrap();
