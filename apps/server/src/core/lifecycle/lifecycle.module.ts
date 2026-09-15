import { Global, Module } from '@nestjs/common';
import { ShutdownService } from './shutdown.service.js';
import { ShutdownState } from './shutdown.state.js';

@Global()
@Module({
  providers: [ShutdownState, ShutdownService],
  exports: [ShutdownState],
})
export class LifecycleModule {}
