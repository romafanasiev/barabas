import type { Client } from 'pg';
import { SECTION_VENUE_ID_LABEL_LIVE_INDEX } from '../../src/modules/venue/infrastructure/section.constraints.js';
import { seed, seedIds } from '../../scripts/seed.js';
import { SqlState, withRollback } from '../../utils/tests/db/db.helpers.js';

const tables = [
  'venue',
  'section',
  'seat',
  'event',
  'ticket_type',
  'event_seat',
  'ticket_allocation',
];

/* Every seeded row without the timestamps: those are now() and legitimately
   differ between runs. */
async function snapshot(client: Client): Promise<unknown[][]> {
  return Promise.all(
    tables.map(async (table) => {
      const { rows } = await client.query<{ row: unknown }>(
        `SELECT to_jsonb(t) - 'created_at' - 'updated_at' AS row FROM ${table} t ORDER BY id`,
      );
      return rows.map(({ row }) => row);
    }),
  );
}

async function count(client: Client, sql: string): Promise<number> {
  const { rows } = await client.query<{ count: number }>(
    `SELECT count(*)::int AS count FROM ${sql}`,
  );
  return rows[0]?.count ?? 0;
}

describe('seed', () => {
  it('fills a clean database with a venue, 500 seats on sale and a concert', () =>
    withRollback(async (client) => {
      await seed(client);

      expect(await count(client, 'venue')).toBe(1);
      expect(await count(client, `section WHERE type = 'numbered'`)).toBe(2);
      expect(await count(client, `section WHERE type = 'standing'`)).toBe(1);
      expect(await count(client, 'seat')).toBe(500);
      expect(await count(client, 'event')).toBe(1);
      expect(await count(client, 'ticket_type')).toBe(3);
      expect(await count(client, 'event_seat')).toBe(500);
      expect(await count(client, 'ticket_allocation')).toBe(1);
    }));

  it('gives every run on a clean database the same rows and ids', async () => {
    const runs: unknown[][][] = [];
    const run = () =>
      withRollback(async (client) => {
        await seed(client);
        runs.push(await snapshot(client));
      });

    await run();
    await run();

    expect(runs[1]).toEqual(runs[0]);
    expect(runs[0]?.[tables.indexOf('seat')]?.[0]).toMatchObject({
      id: seedIds.seat(1),
    });
    expect(runs[0]?.[tables.indexOf('seat')]?.[499]).toMatchObject({
      id: seedIds.seat(500),
    });
  });

  it('changes nothing when run again on a seeded database', () =>
    withRollback(async (client) => {
      await seed(client);
      const first = await snapshot(client);

      await seed(client);

      expect(await snapshot(client)).toEqual(first);
    }));

  it('fails on a row that takes a seeded natural key under another id', () =>
    withRollback(async (client) => {
      await client.query(
        `INSERT INTO venue (id, name, city) VALUES ($1, 'Sky Arena', 'Kyiv')`,
        [seedIds.venue],
      );
      await client.query(
        `INSERT INTO section (venue_id, label, capacity, type)
         VALUES ($1, 'Parter', 10, 'numbered')`,
        [seedIds.venue],
      );

      await expect(seed(client)).rejects.toMatchObject({
        code: SqlState.uniqueViolation,
        constraint: SECTION_VENUE_ID_LABEL_LIVE_INDEX,
      });
    }));

  it('fails over an older seed that no longer matches the hall', () =>
    withRollback(async (client) => {
      await seed(client);
      await client.query(`DELETE FROM event_seat WHERE id = $1`, [
        seedIds.eventSeat(500),
      ]);
      await client.query(`UPDATE seat SET deleted_at = now() WHERE id = $1`, [
        seedIds.seat(500),
      ]);

      await expect(seed(client)).rejects.toThrow(
        'seed: section Balcony has 199 seats, capacity 200',
      );
    }));
});
