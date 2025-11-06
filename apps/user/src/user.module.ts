import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { userEntities } from 'libs/entities/users/list';

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
        entities: userEntities
      })
    })
  ],
  controllers: [UserController],
  providers: [UserService],
})
export class UserModule {}
