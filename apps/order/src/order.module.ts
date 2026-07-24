import { Module } from '@nestjs/common';
import { OrderController } from './order.controller';
import { OrderService } from './order.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { dbSchema, orderEntities } from '@app/lib';
import { RedisModule } from '@app/redis';
import { RabbitProxyModule } from '../../../libs/rabbit-proxy/src';

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
          synchronize: config.get<string>('NODE_ENV') === 'development',
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
    RabbitProxyModule.register([
      'PRODUCT_SERVICE', 'ACCOUNT_SERVICE', 'CART_SERVICE'
    ])
  ],
  controllers: [OrderController],
  providers: [OrderService],
})
export class OrderModule {}
