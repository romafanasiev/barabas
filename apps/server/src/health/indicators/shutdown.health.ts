import { Injectable } from '@nestjs/common';
import { HealthIndicatorService } from '@nestjs/terminus';
import { ShutdownState } from '../../core/lifecycle/shutdown.state.js';

@Injectable()
export class ShutdownHealthIndicator {
  constructor(
    private readonly state: ShutdownState,
    private readonly service: HealthIndicatorService,
  ) {}

  create() {
    const indicator = this.service.check('shutdown');

    return this.state.isShuttingDown
      ? indicator.down('shutting down')
      : indicator.up();
  }
}
