import { Module } from '@nestjs/common';
import { OrderController } from './order.controller';
import { OrderService } from './order.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { dbSchema, orderEntities } from '@app/lib';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { RedisModule } from '@app/redis';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: dbSchema('ORDER')
    }), 
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const isProduction = config.get('URL') === 'true';
        return{
          type: 'mysql',
          ...(isProduction
            ? { url: config.get<string>('ORDER_DB_URL') }
            : {
              host: config.get<string>('MYSQL_ORDER_HOST'),
              port: config.get<number>('MYSQL_PORT'),
              username: config.get<string>('MYSQL_USER'),
              password: config.get<string>('MYSQL_PASSWORD'),
              database: config.get<string>('ORDER_DB_NAME')
            }
          ),
          synchronize: !isProduction,
          poolSize: 10,
          timezone: 'Z',
          entities: orderEntities,
          retryAttempts: 20,
          retryDelay: 3000   
        }
      }
    }),
    RedisModule,
    TypeOrmModule.forFeature(orderEntities),
    ClientsModule.register([
      {
        name: 'PRODUCT_SERVICE',
        transport: Transport.RMQ,
        options: {
          urls: ['amqp://rabbitmq:5672'],
          queue: 'product_queue',
          queueOptions: {
            durable: false
          }
        }
      },
      {
        name: 'ACCOUNT_SERVICE',
        transport: Transport.RMQ,
        options: {
          urls: ['amqp://rabbitmq:5672'],
          queue: 'account_queue',
          queueOptions: {
            durable: false
          }
        }
      },
      {
        name: 'CART_SERVICE',
        transport: Transport.RMQ,
        options: {
          urls: ['amqp://rabbitmq:5672'],
          queue: 'cart_queue',
          queueOptions: {
            durable: false
          }
        }
      }
    ])
  ],
  controllers: [OrderController],
  providers: [OrderService],
})
export class OrderModule {}
