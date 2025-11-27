import { Module } from '@nestjs/common';
import { CartController } from './cart.controller';
import { CartService } from './cart.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { cartEntities } from './entities/list';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true
    }),
    TypeOrmModule.forFeature(cartEntities),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'mysql',
        host: 'localhost',
        port: 3306,
        username: 'root',
        password: 'cervecero1',
        database: 'cart_db',
        synchronize: true,
        //url: process.env.DB_URL,
        poolSize: 10,
        timezone: 'Z',
        entities: cartEntities
      })
    })
  ],
  controllers: [CartController],
  providers: [CartService],
})
export class CartModule {}
