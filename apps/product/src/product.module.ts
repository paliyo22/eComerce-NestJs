import { Module } from '@nestjs/common';
import { ProductController } from './product.controller';
import { ProductService } from './product.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { productEntities } from 'libs/entities/products';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: process.env.NODE_ENV === 'production' ? '../../.env.production' : '../../.env'
    }), 
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'mysql',
        synchronize: true,
        url: config.get<string>('DBUrl'),
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
