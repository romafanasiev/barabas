import { randomUUID } from 'node:crypto';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Client, Pool } from 'pg';
import type { TestProject } from 'vitest/node';

declare module 'vitest' {
  export interface ProvidedContext {
    databaseUrl: string;
  }
}

/* One throwaway database per run: created next to the dev one, migrated from
   ./drizzle, dropped at the end. Tests never touch the dev database. */
export default async function setup(project: TestProject) {
  if (!process.env.POSTGRES_URL) {
    process.loadEnvFile('../../.env');
  }

  const adminUrl = new URL(process.env.POSTGRES_URL as string);
  const name = `test_${randomUUID().replaceAll('-', '')}`;
  const testUrl = new URL(adminUrl);
  testUrl.pathname = `/${name}`;

  const admin = new Client({ connectionString: adminUrl.toString() });
  await admin.connect();
  await admin.query(`CREATE DATABASE "${name}"`);

  const pool = new Pool({ connectionString: testUrl.toString() });
  await migrate(drizzle({ client: pool }), { migrationsFolder: './drizzle' });
  await pool.end();

  project.provide('databaseUrl', testUrl.toString());

  return async () => {
    await admin.query(`DROP DATABASE "${name}" WITH (FORCE)`);
    await admin.end();
  };
}
