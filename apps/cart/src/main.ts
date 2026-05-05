import { NestFactory } from '@nestjs/core';
import { CartModule } from './cart.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const appContext = await NestFactory.createApplicationContext(CartModule);
  const config = appContext.get(ConfigService);
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
      CartModule,
      {
      transport: Transport.RMQ,
      options: { 
        urls: [config.get<string>('RABBITMQ_URL')],
        queue: 'cart_queue',
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
