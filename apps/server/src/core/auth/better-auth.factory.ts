import { Inject, Injectable } from '@nestjs/common';
import { DRIZZLE } from '../infrastructure/infrastructure.tokens.js';
import type { Database } from '../infrastructure/postgres/db.types.js';
import { type Auth, createAuth } from './auth.options.js';

@Injectable()
export class BetterAuthFactory {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  create(): Auth {
    return createAuth(this.db);
  }
}
