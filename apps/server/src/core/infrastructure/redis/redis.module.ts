import { Global, Module } from '@nestjs/common';
import { Redis } from 'ioredis';
import { ENV } from '../../../config/config.module.js';
import { Env } from '../../../config/env.type.js';
import { LOGGER } from '../../telemetry/logger/logger.token.js';
import { AppLogger } from '../../telemetry/logger/logger.type.js';
import { REDIS } from '../infrastructure.tokens.js';

@Global()
@Module({
  providers: [
    {
      provide: REDIS,
      inject: [ENV, LOGGER],
      useFactory: (env: Env, logger: AppLogger): Redis => {
        const redis = new Redis(env.REDIS_URL, {
          enableOfflineQueue: false,
          maxRetriesPerRequest: 2,
          connectTimeout: 2000,
          commandTimeout: 500,
        });

        redis.on('error', (error) =>
          logger.warn(error, 'redis connection error'),
        );

        return redis;
      },
    },
  ],
  exports: [REDIS],
})
export class RedisModule {}
