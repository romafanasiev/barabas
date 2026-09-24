import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { admin } from 'better-auth/plugins/admin';
import type { Database } from '../infrastructure/postgres/db.types.js';

/* Only what shapes the schema lives here: the endpoints, roles, guard and mail
   arrive in M3. See .scratch/m1-domain-model/issues/05, item 2. */
export const createAuth = (db: Database) =>
  betterAuth({
    database: drizzleAdapter(db, { provider: 'pg' }),
    emailAndPassword: { enabled: true },
    rateLimit: { storage: 'database' },
    plugins: [admin()],
  });

export type Auth = ReturnType<typeof createAuth>;
