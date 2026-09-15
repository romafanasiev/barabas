import { type LoggerOptions } from 'pino';
import { isDevEnv } from '../../../config/env.helpers.js';
import { type Env } from '../../../config/env.type.js';
import { censor, redactionPaths } from './logger.redaction.js';
import { serializeRequest, serializeResponse } from './logger.serializers.js';

export const createLoggerOptions = (env: Env): LoggerOptions => {
  const options: LoggerOptions = {
    level: env.LOG_LEVEL,
    redact: {
      paths: redactionPaths,
      censor,
    },
    serializers: {
      req: serializeRequest,
      res: serializeResponse,
    },
  };

  if (isDevEnv(env)) {
    options.transport = {
      target: 'pino-pretty',
    };
  }

  return options;
};
