import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './health.controller.js';
import { PostgresHealthIndicator } from './indicators/postgres.health.js';
import { RedisHealthIndicator } from './indicators/redis.health.js';

@Module({
  imports: [TerminusModule],
  providers: [PostgresHealthIndicator, RedisHealthIndicator],
  controllers: [HealthController],
})
export class HealthModule {}
