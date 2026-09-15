import { Injectable } from '@nestjs/common';

@Injectable()
export class ShutdownState {
  private closing = false;

  get isShuttingDown(): boolean {
    return this.closing;
  }

  begin(): void {
    this.closing = true;
  }
}
