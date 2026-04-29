import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { AccountModule } from './account.module';

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    AccountModule,
    {
      transport: Transport.RMQ,
      options: { 
        urls: ['amqp://rabbitmq:5672'],
        queue: 'account_queue'
      }
    }
  );
  await app.listen();
}
bootstrap();
