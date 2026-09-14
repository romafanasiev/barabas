import { Inject, Injectable, type LoggerService } from '@nestjs/common';
import { LOGGER } from './logger.token.js';
import { type AppLogger } from './logger.type.js';

type PinoLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';

type Fields = Record<string, unknown>;

@Injectable()
export class LoggerAdapter implements LoggerService {
  constructor(@Inject(LOGGER) private readonly logger: AppLogger) {}

  log(message: unknown, ...optionalParams: unknown[]): void {
    this.write('info', message, optionalParams);
  }

  error(message: unknown, ...optionalParams: unknown[]): void {
    this.write('error', message, optionalParams);
  }

  warn(message: unknown, ...optionalParams: unknown[]): void {
    this.write('warn', message, optionalParams);
  }

  debug(message: unknown, ...optionalParams: unknown[]): void {
    this.write('debug', message, optionalParams);
  }

  verbose(message: unknown, ...optionalParams: unknown[]): void {
    this.write('trace', message, optionalParams);
  }

  fatal(message: unknown, ...optionalParams: unknown[]): void {
    this.write('fatal', message, optionalParams);
  }

  /**
   * Nest calls loggers console-style: (message, ...rest, context).
   * Pino wants the opposite: (fieldsToMerge, message). This is that translation,
   * and the only place where it happens.
   */
  private write(
    level: PinoLevel,
    message: unknown,
    optionalParams: unknown[],
  ): void {
    const rest = [...optionalParams];
    const fields: Fields = {};

    // Nest puts the context (usually a class name) last, when it puts one at all.
    if (typeof rest.at(-1) === 'string') {
      fields.context = rest.pop();
    }

    // error() is called as (message, stack, context): the stack is now first in rest.
    if (level === 'error' && typeof rest[0] === 'string') {
      fields.err = { stack: rest.shift() };
    }

    // Anything Nest passed beyond that is kept rather than dropped.
    if (rest.length > 0) {
      fields.params = rest;
    }

    if (message instanceof Error) {
      this.logger[level]({ ...fields, err: message }, message.message);
      return;
    }

    // No message text to speak of — let the object become the record's fields.
    if (typeof message === 'object' && message !== null) {
      this.logger[level]({ ...fields, ...message });
      return;
    }

    this.logger[level](fields, String(message));
  }
}
