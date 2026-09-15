import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckService } from '@nestjs/terminus';
import { PostgresHealthIndicator } from './indicators/postgres.health.js';
import { RedisHealthIndicator } from './indicators/redis.health.js';
import { ShutdownHealthIndicator } from './indicators/shutdown.health.js';

@Controller()
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private psIndicator: PostgresHealthIndicator,
    private redisIndicator: RedisHealthIndicator,
    private shutdownIndicator: ShutdownHealthIndicator,
  ) {}

  @Get('/health')
  getAppHealth(): { status: 'ok' } {
    return { status: 'ok' };
  }

  @Get('/health/ready')
  @HealthCheck()
  getAppHealthReady() {
    return this.health.check([
      () => this.shutdownIndicator.create(),
      () => this.psIndicator.create(),
      () => this.redisIndicator.create(),
    ]);
  }
}
