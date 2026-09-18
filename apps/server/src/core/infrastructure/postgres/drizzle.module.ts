import { Global, Module } from '@nestjs/common';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { DRIZZLE, POSTGRES } from '../infrastructure.tokens.js';
import { Database } from './db.types.js';

@Global()
@Module({
  providers: [
    {
      provide: DRIZZLE,
      inject: [POSTGRES],
      useFactory: (pool: Pool): Database => {
        const db = drizzle({ client: pool });

        return db;
      },
    },
  ],
  exports: [DRIZZLE],
})
export class DrizzleModule {}
