import { Global, Module } from '@nestjs/common';
import { AsyncLocalStorage } from 'node:async_hooks';
import type { AppLogger } from '../../telemetry/logger/logger.type.js';
import { ALS } from './als.token.js';

export type StorageContext = {
  logger: AppLogger;
};

export type TAlsStorage = AsyncLocalStorage<StorageContext>;

@Global()
@Module({
  providers: [
    {
      provide: ALS,
      useValue: new AsyncLocalStorage<StorageContext>(),
    },
  ],
  exports: [ALS],
})
export class AlsModule {}
