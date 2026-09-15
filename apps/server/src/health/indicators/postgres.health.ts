import { Inject, Injectable } from '@nestjs/common';
import { HealthIndicatorService } from '@nestjs/terminus';
import { Pool } from 'pg';
import { POSTGRES } from '../../core/infrastructure/infrastructure.tokens.js';
import { HEALTH_CHECK_TIMEOUT_MS } from '../health.constants.js';

@Injectable()
export class PostgresHealthIndicator {
  constructor(
    @Inject(POSTGRES) private readonly pool: Pool,
    private readonly service: HealthIndicatorService,
  ) {}

  create() {
    return this.service
      .check('postgres')
      .attempt(async ({ signal }) => {
        const client = await this.pool.connect();

        let destroyed = false;

        const onAbort = () => {
          destroyed = true;
          // Истинный аргумент говорит пулу «клиент испорчен»: соединение закрывается
          // и выбрасывается, а не возвращается в пул с висящим на нём запросом.
          client.release(true);
        };

        signal.addEventListener('abort', onAbort, { once: true });

        try {
          await client.query('SELECT 1');
        } finally {
          signal.removeEventListener('abort', onAbort);
          if (!destroyed) {
            client.release();
          }
        }
      })
      .withTimeout(HEALTH_CHECK_TIMEOUT_MS);
  }
}
