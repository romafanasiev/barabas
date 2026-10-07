import type { Client } from 'pg';
import { EVENT_SEAT_SEAT_ID_EVENT_ID_LIVE_INDEX } from '../../src/modules/event/infrastructure/event-seat.constraints.js';
import { TICKET_ALLOCATION_EVENT_ID_SECTION_ID_LIVE_INDEX } from '../../src/modules/event/infrastructure/ticket-allocation.constraints.js';
import { TICKET_TYPE_EVENT_ID_TYPE_LIVE_INDEX } from '../../src/modules/event/infrastructure/ticket-type.constraints.js';
import {
  TICKET_CODE_CONSTRAINT,
  TICKET_EVENT_SEAT_ID_LIVE_INDEX,
} from '../../src/modules/ticketing/infrastructure/ticket.constraints.js';
import { SEAT_SECTION_ID_ROW_NO_SEAT_NUMBER_LIVE_INDEX } from '../../src/modules/venue/infrastructure/seat.constraints.js';
import { SECTION_VENUE_ID_LABEL_LIVE_INDEX } from '../../src/modules/venue/infrastructure/section.constraints.js';
import { ids, seedCatalog } from '../../utils/tests/db/catalog.fixture.js';
import {
  expectViolation,
  SqlState,
  withRollback,
} from '../../utils/tests/db/db.helpers.js';

const seat66 = '30000000-0000-0000-0000-000000000066';

type Case = {
  index: string;
  table: string;
  /* Rows the case needs on top of the catalog. */
  setup?: string;
  /* Inserts the same natural key every time it runs. */
  insert: string;
  /* Narrows the table to rows of this key. */
  key: string;
};

const cases: Case[] = [
  {
    index: SECTION_VENUE_ID_LABEL_LIVE_INDEX,
    table: 'section',
    insert: `INSERT INTO section (venue_id, label, capacity, type)
             VALUES ('${ids.venue}', 'Balcony', 10, 'numbered')`,
    key: `label = 'Balcony'`,
  },
  {
    index: SEAT_SECTION_ID_ROW_NO_SEAT_NUMBER_LIVE_INDEX,
    table: 'seat',
    insert: `INSERT INTO seat (section_id, row_no, seat_number, section_type, venue_id)
             VALUES ('${ids.numberedSection}', 5, 5, 'numbered', '${ids.venue}')`,
    key: `row_no = 5 AND seat_number = 5`,
  },
  {
    index: TICKET_TYPE_EVENT_ID_TYPE_LIVE_INDEX,
    table: 'ticket_type',
    insert: `INSERT INTO ticket_type (event_id, type, price, currency)
             VALUES ('${ids.event}', 'VIP', 500, 'UAH')`,
    key: `type = 'VIP'`,
  },
  {
    index: TICKET_ALLOCATION_EVENT_ID_SECTION_ID_LIVE_INDEX,
    table: 'ticket_allocation',
    insert: `INSERT INTO ticket_allocation (event_id, section_id, ticket_type_id, venue_id,
                                            section_type, section_capacity, capacity)
             VALUES ('${ids.event}', '${ids.standingSection}', '${ids.ticketType}',
                     '${ids.venue}', 'standing', 100, 50)`,
    key: `section_id = '${ids.standingSection}'`,
  },
  {
    index: EVENT_SEAT_SEAT_ID_EVENT_ID_LIVE_INDEX,
    table: 'event_seat',
    setup: `INSERT INTO seat (id, section_id, row_no, seat_number, section_type, venue_id)
            VALUES ('${seat66}', '${ids.numberedSection}', 6, 6, 'numbered', '${ids.venue}')`,
    insert: `INSERT INTO event_seat (event_id, seat_id, ticket_type_id, venue_id)
             VALUES ('${ids.event}', '${seat66}', '${ids.ticketType}', '${ids.venue}')`,
    key: `seat_id = '${seat66}'`,
  },
  {
    index: TICKET_EVENT_SEAT_ID_LIVE_INDEX,
    table: 'ticket',
    insert: `INSERT INTO ticket (payment_id, payment_status, event_seat_id, ticket_type_id,
                                 ticket_price, currency, code)
             VALUES ('${ids.payment}', 'succeeded', '${ids.eventSeat}', '${ids.ticketType}',
                     100, 'UAH', gen_random_uuid()::text)`,
    key: `event_seat_id = '${ids.eventSeat}'`,
  },
];

const softDelete = (c: Case) =>
  `UPDATE ${c.table} SET deleted_at = now() WHERE ${c.key} AND deleted_at IS NULL`;

const count = async (client: Client, c: Case, alive: boolean) => {
  const { rows } = await client.query<{ n: number }>(
    `SELECT count(*)::int AS n FROM ${c.table}
     WHERE ${c.key} AND deleted_at IS ${alive ? '' : 'NOT '}NULL`,
  );
  const [row] = rows;
  if (!row) throw new Error('count(*) returned no row');
  return row.n;
};

const prepare = async (client: Client, c: Case) => {
  await seedCatalog(client);
  if (c.setup) await client.query(c.setup);
  await client.query(c.insert);
};

describe.each(cases)('soft delete: $index', (c) => {
  it('lets the same key be created again after the row is deleted', () =>
    withRollback(async (client) => {
      await prepare(client, c);
      await client.query(softDelete(c));

      await client.query(c.insert);

      expect(await count(client, c, true)).toBe(1);
    }));

  it('still rejects a second live row with the same key', () =>
    withRollback(async (client) => {
      await prepare(client, c);

      await expectViolation(
        client,
        c.insert,
        SqlState.uniqueViolation,
        c.index,
      );
    }));

  it('lets two deleted rows share the key', () =>
    withRollback(async (client) => {
      await prepare(client, c);
      await client.query(softDelete(c));
      await client.query(c.insert);
      await client.query(softDelete(c));

      expect(await count(client, c, false)).toBe(2);
    }));
});

describe('soft delete: keys that stay global', () => {
  it(`${TICKET_CODE_CONSTRAINT}: a refunded ticket's code is never issued again`, () =>
    withRollback(async (client) => {
      await seedCatalog(client);
      const issue = `INSERT INTO ticket (payment_id, payment_status, event_seat_id,
                                         ticket_type_id, ticket_price, currency, code)
                     VALUES ('${ids.payment}', 'succeeded', '${ids.eventSeat}',
                             '${ids.ticketType}', 100, 'UAH', 'PRINTED-1')`;
      await client.query(issue);
      await client.query(
        `UPDATE ticket SET deleted_at = now() WHERE code = 'PRINTED-1'`,
      );

      await expectViolation(
        client,
        issue,
        SqlState.uniqueViolation,
        TICKET_CODE_CONSTRAINT,
      );
    }));
});
