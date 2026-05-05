import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { AccountModule } from './account.module';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const appContext = await NestFactory.createApplicationContext(AccountModule);
  const config = appContext.get(ConfigService);
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    AccountModule,
    {
      transport: Transport.RMQ,
      options: { 
        urls: [config.get<string>('RABBITMQ_URL')],
        queue: 'account_queue',
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
