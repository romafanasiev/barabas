import { DatabaseError, Client } from 'pg';
import { inject } from 'vitest';

/* Every test runs inside a transaction that is rolled back: tests see an empty
   schema and cannot leak rows into each other. */
export async function withRollback(
  fn: (client: Client) => Promise<void>,
): Promise<void> {
  const client = new Client({ connectionString: inject('databaseUrl') });
  await client.connect();

  try {
    await client.query('BEGIN');
    await fn(client);
  } finally {
    await client.query('ROLLBACK');
    await client.end();
  }
}

/* Asserts the statement fails on exactly this constraint or index. A bare
   `rejects` would also pass on a typo in the SQL. The savepoint keeps the outer
   transaction usable after the error. */
export async function expectViolation(
  client: Client,
  sql: string,
  sqlState: string,
  constraint: string,
): Promise<void> {
  await client.query('SAVEPOINT expect_violation');

  try {
    await client.query(sql);
  } catch (error) {
    await client.query('ROLLBACK TO SAVEPOINT expect_violation');
    expect(error).toBeInstanceOf(DatabaseError);
    expect(error).toMatchObject({ code: sqlState, constraint });
    return;
  }

  throw new Error(`expected ${sqlState} on ${constraint}, statement succeeded`);
}
