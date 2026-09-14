import { Inject, Injectable } from '@nestjs/common';
import { type TAlsStorage } from '../../storage/async-local-storage/als.module.js';
import { ALS } from '../../storage/async-local-storage/als.token.js';
import { LOGGER } from './logger.token.js';
import { type AppLogger } from './logger.type.js';

@Injectable()
export class ContextLogger {
  constructor(
    @Inject(ALS) private readonly als: TAlsStorage,
    @Inject(LOGGER) private readonly root: AppLogger,
  ) {}

  private get current(): AppLogger {
    return this.als.getStore()?.logger ?? this.root;
  }

  info(...args: Parameters<AppLogger['info']>): void {
    this.current.info(...args);
  }

  error(...args: Parameters<AppLogger['error']>): void {
    this.current.error(...args);
  }

  warn(...args: Parameters<AppLogger['warn']>): void {
    this.current.warn(...args);
  }

  debug(...args: Parameters<AppLogger['debug']>): void {
    this.current.debug(...args);
  }
}
