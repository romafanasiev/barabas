import { Injectable } from '@nestjs/common';
import { ContextLogger } from './core/telemetry/logger/context-logger.js';

@Injectable()
export class AppService {
  constructor(private readonly logger: ContextLogger) {}

  getHello(): string {
    this.logger.info('greeting requested');

    return 'Hello World!';
  }
}
