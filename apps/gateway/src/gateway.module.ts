import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigModule } from '@nestjs/config';
import { CartController } from './cart/cart.controller';
import { CartService } from './cart/cart.service';
import { OrderController } from './order/order.controller';
import { OrderService } from './order/order.service';
import { ProductController } from './product/product.controller';
import { ProductService } from './product/product.service';
import { AccountController } from './account/account.controller';
import { AccountService } from './account/account.service';
import { AuthController } from './auth/auth.controller';
import { AuthService } from './auth/auth.service';


@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env'
    }),
    ClientsModule.register([
      {
        name: 'PRODUCT_SERVICE',
        transport: Transport.TCP,
        options: { port: 3001 }
      },
      {
        name: 'ACCOUNT_SERVICE',
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
    ProductController, AccountController,
    CartController, OrderController, AuthController
  ],
  providers: [
    ProductService, AccountService,
    CartService, OrderService, AuthService
  ],
})
export class GatewayModule {}
