import { Module } from '@nestjs/common';
import { AccountController } from './account.controller';
import { AccountService } from './account.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { accountEntities, dbSchema } from '@app/lib';
import { RedisModule } from '@app/redis';
import { RabbitProxyModule } from '@app/rabbit-proxy';
import { AdminService } from './admin.service';
import { AuthService } from './auth.service';
import { EventService } from './event.service';
import { GeneralService } from './general.service';
import { AddressService } from './address.service';
import { BalanceService } from './balance.service';
import { StoreService } from './store.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: dbSchema('ACCOUNT')
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const isProduction = config.get('URL') === 'true';
        return{
          type: 'mysql',
          ...(isProduction
            ? { url: config.get<string>('ACCOUNT_DB_URL') }
            : {
              host: config.get<string>('MYSQL_ACCOUNT_HOST'),
              port: config.get<number>('MYSQL_PORT'),
              username: config.get<string>('MYSQL_USER'),
              password: config.get<string>('MYSQL_PASSWORD'),
              database: config.get<string>('ACCOUNT_DB_NAME')
            }
          ),
          synchronize: config.get<string>('NODE_ENV') === 'development',
          poolSize: 10,
          timezone: 'Z',
          entities: accountEntities,
          retryAttempts: 20,
          retryDelay: 3000
        }
      }
    }),
    RedisModule,
    TypeOrmModule.forFeature(accountEntities),
    RabbitProxyModule.register([
      'PRODUCT_SERVICE'
    ])
  ],
  controllers: [AccountController],
  providers: [AccountService, AdminService, AddressService,
    AuthService, EventService, GeneralService, BalanceService,
    StoreService]
})
export class AccountModule {}