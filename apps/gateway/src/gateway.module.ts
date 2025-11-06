import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { CartController, OrderController, ProductController, UserController } from './controller';
import { ProductService, UserService, CartService, OrderService } from './service';
import { ConfigModule } from '@nestjs/config';


@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ClientsModule.register([
      {
        name: 'PRODUCT_SERVICE',
        transport: Transport.TCP,
        options: { port: 3001 }
      },
      {
        name: 'USER_SERVICE',
        transport: Transport.TCP,
        options: { port: 3002 }
      },
      {
        name: 'CART_SERVICE',
        transport: Transport.TCP,
        options: { port: 3003 }
      },
      {
        name: 'ORDER_SERVICE',
        transport: Transport.TCP,
        options: { port: 3004 }
      }
    ])
  ],
  controllers: [
    ProductController, UserController,
    CartController, OrderController
  ],
  providers: [
    ProductService, UserService,
    CartService, OrderService
  ],
})
export class GatewayModule {}
