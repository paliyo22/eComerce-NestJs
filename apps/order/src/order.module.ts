import { Module } from '@nestjs/common';
import { OrderController } from './order.controller';
import { OrderService } from './order.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { orderEntities } from './entities/list';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true
    }), 
    TypeOrmModule.forFeature(orderEntities),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'mysql',
        host: 'localhost',
        port: 3306,
        username: 'root',
        password: 'cervecero1',
        database: 'order_db',
        synchronize: true,
        //url: config.get<string>('DBUrl'),
        poolSize: 10,
        timezone: 'Z',
        entities: orderEntities
      })
    })
  ],
  controllers: [OrderController],
  providers: [OrderService],
})
export class OrderModule {}
