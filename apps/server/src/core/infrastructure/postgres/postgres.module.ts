import { Global, Module } from '@nestjs/common';
import { Pool } from 'pg';
import { ENV } from '../../../config/config.module.js';
import { Env } from '../../../config/env.type.js';
import { LOGGER } from '../../telemetry/logger/logger.token.js';
import { AppLogger } from '../../telemetry/logger/logger.type.js';
import { POSTGRES } from '../infrastructure.tokens.js';

@Global()
@Module({
  providers: [
    {
      provide: POSTGRES,
      inject: [ENV, LOGGER],
      useFactory: (env: Env, logger: AppLogger): Pool => {
        const pool = new Pool({
          connectionString: env.POSTGRES_URL,
          connectionTimeoutMillis: 2000,
        });

        pool.on('error', (error) =>
          logger.warn(error, 'postgres connection error'),
        );

        return pool;
      },
    },
  ],
  exports: [POSTGRES],
})
export class PostgresModule {}
