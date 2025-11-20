import { Module } from '@nestjs/common';
import { AccountController } from './account.controller';
import { AccountService } from './account.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { userEntities } from 'libs/entities/users/list';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'mysql',
        synchronize: true,
        url: process.env.DB_URL,
        poolSize: 10,
        timezone: 'Z',
        entities: userEntities
      })
    })
  ],
  controllers: [AccountController],
  providers: [AccountService]
})
export class AccountModule {}