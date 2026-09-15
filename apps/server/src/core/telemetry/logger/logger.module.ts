import { Global, Module } from '@nestjs/common';
import pino, { type Logger } from 'pino';
import { ENV } from '../../../config/config.module.js';
import { type Env } from '../../../config/env.type.js';
import { ContextLogger } from './context-logger.js';
import { LoggerAdapter } from './logger.adapter.js';
import { createLoggerOptions } from './logger.options.js';
import { LOGGER } from './logger.token.js';

@Global()
@Module({
  providers: [
    {
      provide: LOGGER,
      inject: [ENV],
      useFactory: (env: Env): Logger => pino(createLoggerOptions(env)),
    },
    LoggerAdapter,
    ContextLogger,
  ],
  exports: [LOGGER, ContextLogger],
})
export class LoggerModule {}
