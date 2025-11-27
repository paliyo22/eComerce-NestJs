import { Module } from '@nestjs/common';
import { AccountController } from './account.controller';
import { AccountService } from './account.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { userEntities } from './entities/list';


@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true
    }),
    TypeOrmModule.forFeature(userEntities),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'mysql',
        host: 'localhost',
        port: 3306,
        username: 'root',
        password: 'cervecero1',
        database: 'users_db',
        synchronize: true,
        //url: process.env.DB_URL,
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