import type { Client } from 'pg';
import {
  ids,
  seedNeighbours,
  seedSale,
} from '../../utils/tests/db/catalog.fixture.js';
import * as C from '../../utils/tests/db/constraints.js';
import {
  expectViolation,
  SqlState,
  withRollback,
} from '../../utils/tests/db/db.helpers.js';

const missing = 'ffffffff-ffff-ffff-ffff-ffffffffffff';

/* Each statement breaks exactly one foreign key and keeps every other key of the
   row valid. Foreign keys are checked by triggers in creation order, so a row
   that breaks two would test that order instead of the key. For a composite
   key, "broken" means both rows exist but do not belong together. */
type Case = { what: string; constraint: string; sql: string };

const cases: Case[] = [
  {
    what: 'a section of a venue that does not exist',
    constraint: C.SECTION_VENUE_ID_FK,
    sql: `INSERT INTO section (venue_id, label, capacity, type)
          VALUES ('${missing}', 'X', 10, 'numbered')`,
  },
  {
    what: 'a seat that lies about its section being numbered (I-12)',
    constraint: C.SEAT_SECTION_ID_SECTION_TYPE_FK,
    sql: `INSERT INTO seat (section_id, row_no, seat_number, section_type, venue_id)
          VALUES ('${ids.standingSection}', 9, 9, 'numbered', '${ids.venue}')`,
  },
  {
    what: 'a seat in a section of another venue (I-13)',
    constraint: C.SEAT_SECTION_ID_VENUE_ID_FK,
    sql: `INSERT INTO seat (section_id, row_no, seat_number, section_type, venue_id)
          VALUES ('${ids.numberedSection}', 9, 9, 'numbered', '${ids.otherVenue}')`,
  },
  {
    what: 'an event in a venue that does not exist',
    constraint: C.EVENT_VENUE_ID_FK,
    sql: `INSERT INTO event (venue_id, artist, starts_at, ends_at)
          VALUES ('${missing}', 'X', now(), now() + interval '1 hour')`,
  },
  {
    what: 'a ticket type of an event that does not exist',
    constraint: C.TICKET_TYPE_EVENT_ID_FK,
    sql: `INSERT INTO ticket_type (event_id, type, price, currency)
          VALUES ('${missing}', 'X', 10, 'UAH')`,
  },
  {
    what: 'a ticket type in a currency missing from the reference table',
    constraint: C.TICKET_TYPE_CURRENCY_FK,
    sql: `INSERT INTO ticket_type (event_id, type, price, currency)
          VALUES ('${ids.event}', 'X', 10, 'EUR')`,
  },
  {
    what: 'a seat on sale at an event of another venue (I-13)',
    constraint: C.EVENT_SEAT_EVENT_ID_VENUE_ID_FK,
    sql: `INSERT INTO event_seat (event_id, seat_id, ticket_type_id, venue_id)
          VALUES ('${ids.event}', '${ids.otherVenueSeat}', '${ids.ticketType}',
                  '${ids.otherVenue}')`,
  },
  {
    what: 'a seat of another venue on sale at this event (I-13)',
    constraint: C.EVENT_SEAT_SEAT_ID_VENUE_ID_FK,
    sql: `INSERT INTO event_seat (event_id, seat_id, ticket_type_id, venue_id)
          VALUES ('${ids.event}', '${ids.otherVenueSeat}', '${ids.ticketType}',
                  '${ids.venue}')`,
  },
  {
    what: "a seat priced with another event's ticket type (I-14)",
    constraint: C.EVENT_SEAT_TICKET_TYPE_ID_EVENT_ID_FK,
    sql: `INSERT INTO event_seat (event_id, seat_id, ticket_type_id, venue_id)
          VALUES ('${ids.event}', '${ids.spareSeat}', '${ids.otherTicketType}',
                  '${ids.venue}')`,
  },
  {
    what: 'a quota with a forged copy of the section capacity (I-09)',
    constraint: C.TICKET_ALLOCATION_SECTION_ID_SECTION_CAPACITY_FK,
    sql: `UPDATE ticket_allocation SET section_capacity = 100000
          WHERE id = '${ids.allocation}'`,
  },
  {
    what: 'a quota that lies about its section being standing (I-12)',
    constraint: C.TICKET_ALLOCATION_SECTION_ID_SECTION_TYPE_FK,
    sql: `INSERT INTO ticket_allocation (event_id, section_id, ticket_type_id, venue_id,
                                         section_type, section_capacity, capacity)
          VALUES ('${ids.otherEvent}', '${ids.numberedSection}', '${ids.otherTicketType}',
                  '${ids.venue}', 'standing', 100, 10)`,
  },
  {
    what: 'a quota on a section of another venue (I-13)',
    constraint: C.TICKET_ALLOCATION_SECTION_ID_VENUE_ID_FK,
    sql: `INSERT INTO ticket_allocation (event_id, section_id, ticket_type_id, venue_id,
                                         section_type, section_capacity, capacity)
          VALUES ('${ids.event}', '${ids.otherVenueStanding}', '${ids.ticketType}',
                  '${ids.venue}', 'standing', 50, 10)`,
  },
  {
    what: 'a quota for an event of another venue (I-13)',
    constraint: C.TICKET_ALLOCATION_EVENT_ID_VENUE_ID_FK,
    sql: `INSERT INTO ticket_allocation (event_id, section_id, ticket_type_id, venue_id,
                                         section_type, section_capacity, capacity)
          VALUES ('${ids.event}', '${ids.otherVenueStanding}', '${ids.ticketType}',
                  '${ids.otherVenue}', 'standing', 50, 10)`,
  },
  {
    what: "a quota priced with another event's ticket type (I-14)",
    constraint: C.TICKET_ALLOCATION_TICKET_TYPE_ID_EVENT_ID_FK,
    sql: `UPDATE ticket_allocation SET ticket_type_id = '${ids.otherTicketType}'
          WHERE id = '${ids.allocation}'`,
  },
  {
    what: 'a hold of a user that does not exist',
    constraint: C.HOLD_USER_ID_FK,
    sql: `INSERT INTO hold (user_id, event_id, status, expires_at)
          VALUES ('ghost', '${ids.event}', 'active', now() + interval '10 minutes')`,
  },
  {
    what: 'a hold on an event that does not exist',
    constraint: C.HOLD_EVENT_ID_FK,
    sql: `INSERT INTO hold (user_id, event_id, status, expires_at)
          VALUES ('${ids.user}', '${missing}', 'active', now() + interval '10 minutes')`,
  },
  {
    what: 'a seat item whose hold is for another event (I-37)',
    constraint: C.HOLD_SEAT_ITEM_HOLD_ID_EVENT_ID_FK,
    sql: `INSERT INTO hold_seat_item (hold_id, event_seat_id, event_id, status)
          VALUES ('${ids.hold}', '${ids.otherEventSeat}', '${ids.otherEvent}', 'active')`,
  },
  {
    what: 'a seat item for a seat of another event (I-37)',
    constraint: C.HOLD_SEAT_ITEM_EVENT_SEAT_ID_EVENT_ID_FK,
    sql: `INSERT INTO hold_seat_item (hold_id, event_seat_id, event_id, status)
          VALUES ('${ids.hold}', '${ids.otherEventSeat}', '${ids.event}', 'active')`,
  },
  {
    what: 'a quota item whose hold is for another event (I-37)',
    constraint: C.HOLD_ALLOCATED_ITEM_HOLD_ID_EVENT_ID_FK,
    sql: `INSERT INTO hold_allocated_item (hold_id, allocation_id, event_id, quantity, status)
          VALUES ('${ids.hold}', '${ids.otherAllocation}', '${ids.otherEvent}', 1, 'active')`,
  },
  {
    what: 'a quota item for a quota of another event (I-37)',
    constraint: C.HOLD_ALLOCATED_ITEM_ALLOCATION_ID_EVENT_ID_FK,
    sql: `INSERT INTO hold_allocated_item (hold_id, allocation_id, event_id, quantity, status)
          VALUES ('${ids.hold}', '${ids.otherAllocation}', '${ids.event}', 1, 'active')`,
  },
  {
    what: 'an order for a hold that does not exist',
    constraint: C.ORDER_HOLD_ID_FK,
    sql: `INSERT INTO "order" (hold_id, status, currency, expires_at)
          VALUES ('${missing}', 'pending', 'UAH', now() + interval '15 minutes')`,
  },
  {
    what: 'an order in a currency missing from the reference table',
    constraint: C.ORDER_CURRENCY_FK,
    /* A fresh hold and order: changing the currency of the existing order would
       also break the composite keys of its items and payments. */
    sql: `WITH h AS (
            INSERT INTO hold (user_id, event_id, status, expires_at)
            VALUES ('${ids.user}', '${ids.event}', 'confirmed', now() + interval '10 minutes')
            RETURNING id)
          INSERT INTO "order" (hold_id, status, currency, expires_at)
          SELECT id, 'pending', 'EUR', now() + interval '15 minutes' FROM h`,
  },
  {
    what: "an order item in a currency other than its order's (I-23)",
    constraint: C.ORDER_ITEM_ORDER_ID_CURRENCY_FK,
    sql: `UPDATE order_item SET currency = 'USD' WHERE event_seat_id = '${ids.eventSeat}'`,
  },
  {
    what: 'an order item for a seat that does not exist',
    constraint: C.ORDER_ITEM_EVENT_SEAT_ID_FK,
    sql: `UPDATE order_item SET event_seat_id = '${missing}'
          WHERE event_seat_id = '${ids.eventSeat}'`,
  },
  {
    what: 'an order item for a quota that does not exist',
    constraint: C.ORDER_ITEM_ALLOCATION_ID_FK,
    sql: `UPDATE order_item SET allocation_id = '${missing}'
          WHERE allocation_id = '${ids.allocation}'`,
  },
  {
    what: "a payment in a currency other than its order's (I-23)",
    constraint: C.PAYMENT_ORDER_ID_CURRENCY_FK,
    sql: `UPDATE payment SET currency = 'USD' WHERE id = '${ids.failedPayment}'`,
  },
  {
    what: 'a ticket claiming a failed payment succeeded (I-28)',
    constraint: C.TICKET_PAYMENT_ID_PAYMENT_STATUS_FK,
    sql: `UPDATE ticket SET payment_id = '${ids.failedPayment}' WHERE id = '${ids.ticket}'`,
  },
  {
    what: 'a ticket of a ticket type that does not exist',
    constraint: C.TICKET_TICKET_TYPE_ID_FK,
    sql: `UPDATE ticket SET ticket_type_id = '${missing}' WHERE id = '${ids.ticket}'`,
  },
  {
    what: 'a ticket in a currency missing from the reference table',
    constraint: C.TICKET_CURRENCY_FK,
    sql: `UPDATE ticket SET currency = 'EUR' WHERE id = '${ids.ticket}'`,
  },
  {
    what: 'a ticket for a seat that does not exist',
    constraint: C.TICKET_EVENT_SEAT_ID_FK,
    sql: `UPDATE ticket SET event_seat_id = '${missing}' WHERE id = '${ids.ticket}'`,
  },
  {
    what: 'a ticket for a quota that does not exist',
    constraint: C.TICKET_ALLOCATION_ID_FK,
    sql: `UPDATE ticket SET event_seat_id = NULL, allocation_id = '${missing}'
          WHERE id = '${ids.ticket}'`,
  },
  {
    what: 'a check-in of a ticket that does not exist',
    constraint: C.CHECK_IN_TICKET_ID_FK,
    sql: `INSERT INTO check_in (ticket_id) VALUES ('${missing}')`,
  },
];

const seed = async (client: Client) => {
  await seedSale(client);
  await seedNeighbours(client);
};

describe('foreign keys: a child cannot point at a missing or foreign parent', () => {
  it.each(cases)('rejects $what ($constraint)', ({ sql, constraint }) =>
    withRollback(async (client) => {
      await seed(client);

      await expectViolation(
        client,
        sql,
        SqlState.foreignKeyViolation,
        constraint,
      );
    }),
  );
});

describe('ON DELETE', () => {
  /* A section with seats is held by two keys at once (type and venue); which one
     answers depends on creation order, so the single-key case is the venue. */
  it('RESTRICT: a venue with sections cannot be deleted', () =>
    withRollback(async (client) => {
      await seed(client);

      await expectViolation(
        client,
        `DELETE FROM venue WHERE id = '${ids.otherVenue}'`,
        SqlState.restrictViolation,
        C.SECTION_VENUE_ID_FK,
      );
    }));

  it('RESTRICT: a seat that was ever put on sale cannot be deleted', () =>
    withRollback(async (client) => {
      await seed(client);

      await expectViolation(
        client,
        `DELETE FROM seat WHERE id = '${ids.seat}'`,
        SqlState.restrictViolation,
        C.EVENT_SEAT_SEAT_ID_VENUE_ID_FK,
      );
    }));

  it('CASCADE inside the aggregate: a hold takes its items with it', () =>
    withRollback(async (client) => {
      await seed(client);
      const { rows } = await client.query<{ id: string }>(
        `INSERT INTO hold (user_id, event_id, status, expires_at)
         VALUES ('${ids.user}', '${ids.otherEvent}', 'cancelled', now() + interval '1 minute')
         RETURNING id`,
      );
      const holdId = rows[0]?.id;
      await client.query(
        `INSERT INTO hold_seat_item (hold_id, event_seat_id, event_id, status)
         VALUES ('${holdId}', '${ids.otherEventSeat}', '${ids.otherEvent}', 'released')`,
      );

      await client.query(`DELETE FROM hold WHERE id = '${holdId}'`);

      const left = await client.query(
        `SELECT 1 FROM hold_seat_item WHERE hold_id = '${holdId}'`,
      );
      expect(left.rowCount).toBe(0);
    }));
});

describe('ON UPDATE CASCADE of the section capacity copy (I-09)', () => {
  it('follows a hall that grows', () =>
    withRollback(async (client) => {
      await seed(client);

      await client.query(
        `UPDATE section SET capacity = 800 WHERE id = '${ids.standingSection}'`,
      );

      const { rows } = await client.query<{ section_capacity: number }>(
        `SELECT section_capacity FROM ticket_allocation WHERE id = '${ids.allocation}'`,
      );
      expect(rows[0]?.section_capacity).toBe(800);
    }));

  it('refuses to shrink a hall under an open quota, and the hall keeps its size', () =>
    withRollback(async (client) => {
      await seed(client);

      await expectViolation(
        client,
        `UPDATE section SET capacity = 10 WHERE id = '${ids.standingSection}'`,
        SqlState.checkViolation,
        C.TICKET_ALLOCATION_CAPACITY_CHECK,
      );

      const { rows } = await client.query<{ capacity: number }>(
        `SELECT capacity FROM section WHERE id = '${ids.standingSection}'`,
      );
      expect(rows[0]?.capacity).toBe(100);
    }));
});
