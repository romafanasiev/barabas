import { type LoggerOptions } from 'pino';
import { isDevEnv } from '../../../config/env.helpers.js';
import { type Env } from '../../../config/env.type.js';

export const createLoggerOptions = (env: Env): LoggerOptions => {
  const options: LoggerOptions = {
    level: env.LOG_LEVEL,
    redact: [
      'req.headers.authorization',
      'req.headers.cookie',
      'res.headers["set-cookie"]',
      'password',
      '*.password',
      'token',
      '*.token',
    ],
  };

  if (isDevEnv(env)) {
    options.transport = {
      target: 'pino-pretty',
    };
  }

  return options;
};
