import { Inject, Injectable } from '@nestjs/common';
import { HealthIndicatorService } from '@nestjs/terminus';
import { Redis } from 'ioredis';
import { REDIS } from '../../core/infrastructure/infrastructure.tokens.js';
import { HEALTH_CHECK_TIMEOUT_MS } from '../health.constants.js';

@Injectable()
export class RedisHealthIndicator {
  constructor(
    @Inject(REDIS) private readonly redis: Redis,
    private readonly service: HealthIndicatorService,
  ) {}

  create() {
    return this.service
      .check('redis')
      .attempt(async () => {
        await this.redis.ping();
      })
      .withTimeout(HEALTH_CHECK_TIMEOUT_MS);
  }
}
