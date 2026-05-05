import { NestFactory } from '@nestjs/core';
import { OrderModule } from './order.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const appContext = await NestFactory.createApplicationContext(OrderModule);
  const config = appContext.get(ConfigService);
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
      OrderModule,
      {
        transport: Transport.RMQ,
        options: { 
          urls: [config.get<string>('RABBITMQ_URL')],
          queue: 'order_queue',
          queueOptions: {
          durable: false,
          arguments: {
            'x-message-ttl': config.get<number>('MESSAGE_TIMEOUT')
          }
        }
        }
      }
    );
    await app.listen();
}
bootstrap();
