import { Client } from 'pg';
import { inject } from 'vitest';
import { ids, seedSale } from '../../utils/tests/db/catalog.fixture.js';
import {
  expectError,
  SqlState,
  withRollback,
} from '../../utils/tests/db/db.helpers.js';

/* impossible-states.md, section 1, "by type and NOT NULL". The column list is read
   from the live schema, not written by hand: a new NOT NULL or varchar column is
   covered without touching this file. Tables of better-auth are out of scope. */
const AUTH_TABLES = [
  'user',
  'session',
  'account',
  'verification',
  'rate_limit',
];

type Column = {
  table: string;
  column: string;
  isNullable: 'YES' | 'NO';
  dataType: string;
  udtName: string;
  maxLength: number | null;
};

const columns = await (async () => {
  const client = new Client({ connectionString: inject('databaseUrl') });
  await client.connect();
  try {
    const { rows } = await client.query<Column>(
      `SELECT c.table_name AS "table", c.column_name AS "column",
              c.is_nullable AS "isNullable", c.data_type AS "dataType",
              c.udt_name AS "udtName", c.character_maximum_length AS "maxLength"
       FROM information_schema.columns c
       JOIN information_schema.tables t
         ON t.table_schema = c.table_schema AND t.table_name = c.table_name
       WHERE c.table_schema = 'public' AND t.table_type = 'BASE TABLE'
         AND c.table_name <> ALL ($1)
       ORDER BY c.table_name, c.ordinal_position`,
      [AUTH_TABLES],
    );
    return rows;
  } finally {
    await client.end();
  }
})();

const columnsOf = (table: string) =>
  columns.filter((c) => c.table === table).map((c) => c.column);

/* Copies an existing valid row of the table with one column replaced. The
   replaced value is the only thing wrong with the new row, and NOT NULL and
   type errors are raised before any CHECK or index sees it. */
const copyRowWith = (target: Column, expression: string) => {
  const names = columnsOf(target.table);
  const list = names.map((name) => `"${name}"`).join(', ');
  const values = names
    .map((name) => (name === target.column ? expression : `"${name}"`))
    .join(', ');
  return `INSERT INTO "${target.table}" (${list})
          SELECT ${values} FROM "${target.table}" LIMIT 1`;
};

const label = (c: Column) => `${c.table}.${c.column}`;

describe('NOT NULL: every required column rejects NULL', () => {
  const required = columns.filter((c) => c.isNullable === 'NO');

  it('found the columns', () => {
    expect(required.length).toBeGreaterThan(100);
  });

  it.each(required.map((c) => [label(c), c] as const))('%s', (_, c) =>
    withRollback(async (client) => {
      await seedSale(client);

      await expectError(client, copyRowWith(c, 'NULL'), {
        code: SqlState.notNullViolation,
        column: c.column,
      });
    }),
  );
});

describe('varchar(255): a longer string is rejected, not cut', () => {
  const limited = columns.filter((c) => c.maxLength === 255);

  it.each(limited.map((c) => [label(c), c] as const))('%s', (_, c) =>
    withRollback(async (client) => {
      await seedSale(client);

      await expectError(client, copyRowWith(c, `repeat('x', 256)`), {
        code: SqlState.stringDataRightTruncation,
        message: /value too long for type character varying\(255\)/,
      });
    }),
  );
});

describe('enum: a status outside the list is rejected', () => {
  const enums = columns.filter((c) => c.dataType === 'USER-DEFINED');

  it.each(enums.map((c) => [label(c), c] as const))('%s', (_, c) =>
    withRollback(async (client) => {
      await seedSale(client);

      await expectError(client, copyRowWith(c, `'bogus'::${c.udtName}`), {
        code: SqlState.invalidTextRepresentation,
        message: new RegExp(`invalid input value for enum ${c.udtName}`),
      });
    }),
  );
});

describe('uuid and timestamptz reject what they cannot parse', () => {
  it('uuid', () =>
    withRollback(async (client) => {
      await expectError(client, `SELECT * FROM venue WHERE id = 'venue-1'`, {
        code: SqlState.invalidTextRepresentation,
        message: /invalid input syntax for type uuid/,
      });
    }));

  it('timestamptz', () =>
    withRollback(async (client) => {
      await seedSale(client);

      await expectError(
        client,
        `UPDATE event SET starts_at = 'next friday' WHERE id = '${ids.event}'`,
        {
          code: SqlState.invalidDatetimeFormat,
          message: /invalid input syntax for type timestamp with time zone/,
        },
      );
    }));

  it('integer rejects a fractional string', () =>
    withRollback(async (client) => {
      await seedSale(client);

      await expectError(
        client,
        `UPDATE seat SET row_no = '1.5' WHERE id = '${ids.seat}'`,
        {
          code: SqlState.invalidTextRepresentation,
          message: /invalid input syntax for type integer/,
        },
      );
    }));
});

/* Not protections: the type silently rounds. These tests pin the behaviour so
   nobody mistakes it for a guard (impossible-states.md says so in words). */
describe('rounding the type does instead of rejecting', () => {
  it('numeric(12, 2) rounds 10.005 to 10.01', () =>
    withRollback(async (client) => {
      await seedSale(client);

      const { rows } = await client.query<{ price: string }>(
        `UPDATE ticket_type SET price = 10.005 WHERE id = '${ids.ticketType}'
         RETURNING price`,
      );

      expect(rows[0]?.price).toBe('10.01');
    }));

  it('integer rounds a fractional number: 1.5 becomes 2', () =>
    withRollback(async (client) => {
      await seedSale(client);

      const { rows } = await client.query<{ row_no: number }>(
        `UPDATE seat SET row_no = 1.5 WHERE id = '${ids.seat}' RETURNING row_no`,
      );

      expect(rows[0]?.row_no).toBe(2);
    }));
});
