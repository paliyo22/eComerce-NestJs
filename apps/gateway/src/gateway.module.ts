import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { gatewaySchema } from '@app/lib';
import { AccountModule } from './account/account.module';
import { AddressModule } from './address/address.module';
import { AdminModule } from './admin/admin.module';
import { AuthModule } from './auth/auth.module';
import { BalanceModule } from './balance/balance.module';
import { CartModule } from './cart/cart.module';
import { CheckoutModule } from './checkout/checkout.module';
import { JwtStrategy } from './helpers/jwt.strategy';
import { RefreshTokenStrategy } from './helpers/jwtRefresh.strategy';
import { OrderModule } from './order/order.module';
import { ProductModule } from './product/product.module';
import { ReviewModule } from './review/review.module';
import { StoreModule } from './store/store.module';


@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: gatewaySchema
    }),
    PassportModule, AccountModule, AddressModule,
    AdminModule, AuthModule, CartModule, 
    CheckoutModule, OrderModule, ProductModule, 
    ReviewModule, StoreModule, BalanceModule
  ],
  providers: [JwtStrategy, RefreshTokenStrategy]
})
export class GatewayModule {}