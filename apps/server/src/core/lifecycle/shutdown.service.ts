import {
  BeforeApplicationShutdown,
  Inject,
  Injectable,
  OnApplicationShutdown,
  OnModuleDestroy,
} from '@nestjs/common';
import { Redis } from 'ioredis';
import { Pool } from 'pg';
import { ENV } from '../../config/config.module.js';
import { type Env } from '../../config/env.type.js';
import { POSTGRES, REDIS } from '../infrastructure/infrastructure.tokens.js';
import { LOGGER } from '../telemetry/logger/logger.token.js';
import { type AppLogger } from '../telemetry/logger/logger.type.js';
import { ShutdownState } from './shutdown.state.js';

/**
 * Time given to the logger to write the last line before the deadline kills the
 * process. In development pino writes through a transport, i.e. a worker thread:
 * an immediate process.exit() would drop the very line that explains the exit.
 */
const FLUSH_GRACE_MS = 100;

/**
 * Owns the shutdown sequence. Every hook here is a deliberate position in the
 * order Nest runs (nest-application-context.js, close()):
 *
 *   onModuleDestroy -> beforeApplicationShutdown -> [http server closes] -> onApplicationShutdown
 *
 * The closing of the http server sits between the last two hooks, which is the
 * whole reason dependencies may only be torn down in onApplicationShutdown: by
 * then every in-flight request has been answered.
 */
@Injectable()
export class ShutdownService
  implements OnModuleDestroy, BeforeApplicationShutdown, OnApplicationShutdown
{
  private deadline?: NodeJS.Timeout;

  constructor(
    @Inject(ENV) private readonly env: Env,
    @Inject(LOGGER) private readonly logger: AppLogger,
    @Inject(POSTGRES) private readonly pool: Pool,
    @Inject(REDIS) private readonly redis: Redis,
    private readonly state: ShutdownState,
  ) {}

  /**
   * First hook in the chain, so the deadline covers everything that follows —
   * the drain delay, the server close and the dependency teardown alike.
   */
  onModuleDestroy(): void {
    this.armDeadline();
  }

  /**
   * Runs before the http server closes, so traffic is still being accepted.
   * Readiness flips to 503 here and then we wait: the load balancer needs to
   * notice and stop sending new requests before the door is shut.
   */
  async beforeApplicationShutdown(signal?: string): Promise<void> {
    this.state.begin();

    const delayMs = this.env.SHUTDOWN_DRAIN_DELAY_MS;

    this.logger.info(
      { signal, delayMs },
      'shutdown signal received, readiness now reports 503',
    );

    if (delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }

    this.logger.info({ signal }, 'drain delay elapsed, closing http server');
  }

  /**
   * Runs after the http server is closed and in-flight requests have been
   * answered. Only now is it safe to take the database away from them.
   */
  async onApplicationShutdown(signal?: string): Promise<void> {
    this.logger.info({ signal }, 'http server closed');

    await this.closeDependency('postgres', () => this.pool.end());
    await this.closeDependency('redis', () => this.redis.quit());

    this.disarmDeadline();
  }

  private async closeDependency(
    dependency: string,
    close: () => Promise<unknown>,
  ): Promise<void> {
    try {
      await close();
      this.logger.info({ dependency }, 'dependency closed');
    } catch (err) {
      this.logger.error({ dependency, err }, 'dependency failed to close');
    }
  }

  private armDeadline(): void {
    const timeoutMs = this.env.SHUTDOWN_TIMEOUT_MS;

    this.deadline = setTimeout(() => {
      this.logger.fatal(
        { timeoutMs },
        'shutdown deadline exceeded, exiting the hard way',
      );
      this.logger.flush();
      setTimeout(() => process.exit(1), FLUSH_GRACE_MS);
    }, timeoutMs);

    this.deadline.unref();
  }

  private disarmDeadline(): void {
    if (this.deadline) {
      clearTimeout(this.deadline);
      this.deadline = undefined;
    }
  }
}
