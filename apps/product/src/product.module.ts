import { Module } from '@nestjs/common';
import { ProductController } from './product.controller';
import { ProductService } from './product.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { dbSchema, productEntities } from '@app/lib';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RedisModule } from '@app/redis';
import { RabbitProxyModule } from '@app/rabit-proxy';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: dbSchema('PRODUCT')
    }), 
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const isProduction = config.get('URL') === 'true';
        return{
          type: 'mysql',
          ...(isProduction
            ? { url: config.get<string>('PRODUCT_DB_URL') }
            : {
              host: config.get<string>('MYSQL_PRODUCT_HOST'),
              port: config.get<number>('MYSQL_PORT'),
              username: config.get<string>('MYSQL_USER'),
              password: config.get<string>('MYSQL_PASSWORD'),
              database: config.get<string>('PRODUCT_DB_NAME')
            }
          ),
          synchronize: config.get<string>('NODE_ENV') === 'production',
          poolSize: 10,
          timezone: 'Z',
          entities: productEntities,
          retryAttempts: 20,
          retryDelay: 3000   
        }
      }
    }),
    RedisModule,
    TypeOrmModule.forFeature(productEntities),
    RabbitProxyModule.register([
      'ACCOUNT_SERVICE', 'CART_SERVICE'
    ])
  ],
  controllers: [ProductController],
  providers: [ProductService],
})
export class ProductModule {}
