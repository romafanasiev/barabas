import { readdirSync, readFileSync } from 'node:fs';
import { Client } from 'pg';
import { inject } from 'vitest';
import * as C from '../../utils/tests/db/constraints.js';

/* ADR-0004: every object in the schema has a test, otherwise nobody notices when
   it disappears. This file compares the constraints of the live database with
   the constants the other *.db-spec.ts files reference. A new CHECK, key or
   partial index without a test turns this red. */

/* (id, X) keys: targets of composite foreign keys. They contain the primary key,
   so a duplicate fails on *_pkey first, and there is nothing of their own to break.
   Their job is tested through the foreign keys that point at them. */
const NOT_TESTED_DIRECTLY = new Set<string>([
  C.SECTION_ID_TYPE_CONSTRAINT,
  C.SECTION_ID_CAPACITY_CONSTRAINT,
  C.SECTION_ID_VENUE_ID_CONSTRAINT,
  C.SEAT_ID_VENUE_ID_CONSTRAINT,
  C.EVENT_ID_VENUE_ID_CONSTRAINT,
  C.TICKET_TYPE_ID_EVENT_ID_CONSTRAINT,
  C.EVENT_SEAT_ID_EVENT_ID_CONSTRAINT,
  C.TICKET_ALLOCATION_ID_EVENT_ID_CONSTRAINT,
  C.HOLD_ID_EVENT_ID_CONSTRAINT,
  C.ORDER_ID_CURRENCY_CONSTRAINT,
  C.PAYMENT_ID_STATUS_CONSTRAINT,
]);

const AUTH_TABLES = [
  'user',
  'session',
  'account',
  'verification',
  'rate_limit',
];

const constants = Object.entries(C) as [string, string][];

const referencedInTests = (() => {
  const sources = readdirSync('test/db')
    .filter((f) => f.endsWith('.db-spec.ts') && f !== 'coverage.db-spec.ts')
    .map((f) => readFileSync(`test/db/${f}`, 'utf8'))
    .join('\n');
  return new Set(
    constants
      .filter(([name]) => new RegExp(`\\b${name}\\b`).test(sources))
      .map(([, value]) => value),
  );
})();

const schemaObjects = await (async () => {
  const client = new Client({ connectionString: inject('databaseUrl') });
  await client.connect();
  try {
    const { rows } = await client.query<{ name: string }>(
      `SELECT c.conname AS name
       FROM pg_constraint c
       JOIN pg_class t ON t.oid = c.conrelid
       JOIN pg_namespace n ON n.oid = t.relnamespace
       WHERE n.nspname = 'public' AND c.contype IN ('c', 'f', 'u')
         AND t.relname <> ALL ($1)
       UNION
       SELECT i.relname
       FROM pg_index x
       JOIN pg_class i ON i.oid = x.indexrelid
       JOIN pg_class t ON t.oid = x.indrelid
       JOIN pg_namespace n ON n.oid = t.relnamespace
       WHERE n.nspname = 'public' AND x.indisunique AND NOT x.indisprimary
         AND t.relname <> ALL ($1)
         AND NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conindid = x.indexrelid)
       ORDER BY 1`,
      [AUTH_TABLES],
    );
    return rows.map((r) => r.name);
  } finally {
    await client.end();
  }
})();

describe('coverage of the schema by db tests', () => {
  it('reads a plausible schema', () => {
    expect(schemaObjects.length).toBeGreaterThan(80);
  });

  it('has a constant for every constraint in the database', () => {
    const declared = new Set(constants.map(([, value]) => value));

    expect(schemaObjects.filter((name) => !declared.has(name))).toEqual([]);
  });

  it('has no constant for a constraint the database does not have', () => {
    const live = new Set(schemaObjects);

    expect(
      constants.filter(([, value]) => !live.has(value)).map(([name]) => name),
    ).toEqual([]);
  });

  it('tests every constraint, except the named (id, X) anchors', () => {
    const untested = schemaObjects.filter(
      (name) => !referencedInTests.has(name) && !NOT_TESTED_DIRECTLY.has(name),
    );

    expect(untested).toEqual([]);
  });
});
