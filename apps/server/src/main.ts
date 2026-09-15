import { ShutdownSignal } from '@nestjs/common';
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
  // useProcessExit makes Nest call process.exit(0) instead of re-raising the
  // signal at itself. The cost is the exit code: a SIGTERM shutdown reports 0
  // rather than 143. It is worth paying because pino writes through a worker
  // thread in development, and dying from a signal drops whatever the transport
  // had not flushed yet — including the lines that describe the shutdown. The
  // deadline in ShutdownService still exits non-zero, so an unhealthy stop
  // remains distinguishable by exit code.
  app.enableShutdownHooks(
    [ShutdownSignal.SIGTERM, ShutdownSignal.SIGINT, ShutdownSignal.SIGHUP],
    { useProcessExit: true },
  );

  await app.listen(env.PORT);
}
await bootstrap();
