import { Module } from '@nestjs/common';
import { CartController } from './cart.controller';
import { CartService } from './cart.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { cartEntities, dbSchema } from '@app/lib';
import { RedisModule } from '@app/redis';
import { RabbitProxyModule } from '@app/rabbit-proxy';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: dbSchema('CART')
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const isProduction = config.get('URL') === 'true';
        return{
          type: 'mysql',
          ...(isProduction
            ? { url: config.get<string>('CART_DB_URL') }
            : {
              host: config.get<string>('MYSQL_CART_HOST'),
              port: config.get<number>('MYSQL_PORT'),
              username: config.get<string>('MYSQL_USER'),
              password: config.get<string>('MYSQL_PASSWORD'),
              database: config.get<string>('CART_DB_NAME')
            }
          ),
          synchronize: config.get<string>('NODE_ENV') === 'development',
          poolSize: 10,
          timezone: 'Z',
          entities: cartEntities,
          retryAttempts: 20,
          retryDelay: 3000   
        }
      }
    }),
    RedisModule,
    TypeOrmModule.forFeature(cartEntities),
    RabbitProxyModule.register(['PRODUCT_SERVICE'])
  ],
  controllers: [CartController],
  providers: [CartService],
})
export class CartModule {}
