import { DynamicModule, Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientsModule, Transport, RmqOptions } from '@nestjs/microservices';

@Global()
@Module({})
export class RabbitProxyModule {
  static register(serviceName: string[]): DynamicModule{
    const clients = serviceName.map((name) => ({
      name,
      inject: [ConfigService],
      useFactory: (config: ConfigService): RmqOptions => ({
        transport: Transport.RMQ,
        options: {
          urls: [config.get<string>('RABBITMQ_URL')],
          queue: `${name.split('_')[0].toLowerCase()}_queue`,
          queueOptions: {
            durable: false,
            arguments: {
              'x-message-ttl': config.get<number>('MESSAGE_TIMEOUT')
            }
          }
        }
      })
    }));
    
    return {
      module: RabbitProxyModule,
      imports: [ClientsModule.registerAsync(clients)],
      exports: [ClientsModule]
    }
  }
}
