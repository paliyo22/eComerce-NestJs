import { Module } from '@nestjs/common';
import { ProductController } from './product.controller';
import { ProductService } from './product.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { productEntities } from 'apps/product/src/entities';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  
  imports: [
    ConfigModule.forRoot({
      isGlobal: true
    }), 
    TypeOrmModule.forFeature(productEntities),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'mysql',
        host: 'localhost',
        port: 3306,
        username: 'root',
        password: 'cervecero1',
        database: 'product_db',
        synchronize: true,
        //url: config.get<string>('DBUrl'),
        poolSize: 10,
        timezone: 'Z',
        entities: productEntities
      })
    })
  ],
  controllers: [ProductController],
  providers: [ProductService],
})
export class ProductModule {}
