import { DatabaseError, Client } from 'pg';
import { inject } from 'vitest';

export const SqlState = {
  notNullViolation: '23502',
  foreignKeyViolation: '23503',
  uniqueViolation: '23505',
  checkViolation: '23514',
  restrictViolation: '23001',
  invalidTextRepresentation: '22P02',
  invalidDatetimeFormat: '22007',
  stringDataRightTruncation: '22001',
} as const;

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

type ExpectedError = {
  code: string;
  constraint?: string;
  column?: string;
  /* Only for errors that carry no constraint or column name (22P02, 22001). */
  message?: RegExp;
};

/* Asserts the statement fails with exactly this error. A bare `rejects` would
   also pass on a typo in the SQL. The savepoint keeps the outer transaction
   usable after the error. */
export async function expectError(
  client: Client,
  sql: string,
  expected: ExpectedError,
): Promise<void> {
  await client.query('SAVEPOINT expect_error');

  try {
    await client.query(sql);
  } catch (error) {
    await client.query('ROLLBACK TO SAVEPOINT expect_error');
    expect(error).toBeInstanceOf(DatabaseError);
    const { message, ...fields } = expected;
    expect(error).toMatchObject(fields);
    if (message) expect((error as DatabaseError).message).toMatch(message);
    return;
  }

  throw new Error(
    `expected ${expected.code} ${expected.constraint ?? expected.column ?? ''}, statement succeeded`,
  );
}

export function expectViolation(
  client: Client,
  sql: string,
  code: string,
  constraint: string,
): Promise<void> {
  return expectError(client, sql, { code, constraint });
}
