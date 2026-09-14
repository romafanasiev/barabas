import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { ENV } from './config/config.module.js';
import { Env } from './config/env.type.js';
import { LoggerAdapter } from './core/telemetry/logger/logger.adapter.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  const env = app.get<Env>(ENV);
  const logger = app.get(LoggerAdapter);

  app.useLogger(logger);

  await app.listen(env.PORT);
}
await bootstrap();
