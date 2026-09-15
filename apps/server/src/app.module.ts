import { MiddlewareConsumer, Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { AppConfigModule } from './config/config.module.js';
import { PostgresModule } from './core/infrastructure/postgres/postgres.module.js';
import { RedisModule } from './core/infrastructure/redis/redis.module.js';
import { AlsModule } from './core/storage/async-local-storage/als.module.js';
import { LoggerMiddleware } from './core/telemetry/logger/logger.middleware.js';
import { LoggerModule } from './core/telemetry/logger/logger.module.js';
import { PinoHttpMiddleware } from './core/telemetry/logger/pino-http.middleware.js';
import { HealthModule } from './health/health.module.js';

@Module({
  imports: [
    AppConfigModule,
    PostgresModule,
    RedisModule,
    LoggerModule,
    AlsModule,
    HealthModule,
  ],
  controllers: [AppController],
  providers: [AppService, PinoHttpMiddleware, LoggerMiddleware],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(PinoHttpMiddleware, LoggerMiddleware).forRoutes('*');
  }
}
