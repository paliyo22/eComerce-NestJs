import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: 'REDIS_CLIENT',
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        return new Redis({
          host: config.get<string>('REDIS_HOST'),
          port: config.get<number>('REDIS_PORT'),
          retryStrategy: (times) => Math.min(times * 500, 5000), 
          maxRetriesPerRequest: null,
          lazyConnect: true, 
        });
      }
    }
  ],
  exports: ['REDIS_CLIENT']
})
export class RedisModule {}