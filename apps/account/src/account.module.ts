import { Module } from '@nestjs/common';
import { AccountController } from './account.controller';
import { AccountService } from './account.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { accountEntities, dbSchema } from '@app/lib';

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
          synchronize: !isProduction,
          poolSize: 10,
          timezone: 'Z',
          entities: accountEntities,
          retryAttempts: 20,
          retryDelay: 3000
        }
      }
    }),
    TypeOrmModule.forFeature(accountEntities)
  ],
  controllers: [AccountController],
  providers: [AccountService]
})
export class AccountModule {}