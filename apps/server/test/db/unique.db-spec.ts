import { ids, seedSale } from '../../utils/tests/db/catalog.fixture.js';
import * as C from '../../utils/tests/db/constraints.js';
import {
  expectViolation,
  SqlState,
  withRollback,
} from '../../utils/tests/db/db.helpers.js';

/* Unique keys outside soft delete; the *_live_uq indexes are in soft-delete.db-spec.ts.
   Keys of the form (id, X) are not here: they exist as targets of composite foreign
   keys, and a duplicate of them is a duplicate primary key first. */
type Case = { state: string; constraint: string; sql: string };

const rejected: Case[] = [
  {
    state: 'a second order for one hold (I-21)',
    constraint: C.ORDER_HOLD_ID_CONSTRAINT,
    sql: `INSERT INTO "order" (hold_id, status, currency, expires_at)
          VALUES ('${ids.hold}', 'pending', 'UAH', now() + interval '15 minutes')`,
  },
  {
    state: 'a second payment with the same idempotency key (I-25)',
    constraint: C.PAYMENT_IDEMPOTENCY_KEY_CONSTRAINT,
    sql: `INSERT INTO payment (order_id, status, idempotency_key, price, currency)
          VALUES ('${ids.order}', 'pending', 'k1', 300, 'UAH')`,
  },
  {
    state: 'a second successful payment for one order (I-24)',
    constraint: C.PAYMENT_ORDER_ID_SUCCEEDED_INDEX,
    sql: `UPDATE payment SET status = 'succeeded' WHERE id = '${ids.failedPayment}'`,
  },
  {
    state: 'a seat held by two active items (I-01)',
    constraint: C.HOLD_SEAT_ITEM_EVENT_SEAT_ID_ACTIVE_INDEX,
    sql: `WITH h AS (
            INSERT INTO hold (user_id, event_id, status, expires_at)
            VALUES ('${ids.user}', '${ids.event}', 'active', now() + interval '10 minutes')
            RETURNING id)
          INSERT INTO hold_seat_item (hold_id, event_seat_id, event_id, status)
          SELECT id, '${ids.eventSeat}', '${ids.event}', 'active' FROM h`,
  },
  {
    state: 'one quota twice among the active items of a hold (I-10)',
    constraint: C.HOLD_ALLOCATED_ITEM_HOLD_ID_ALLOCATION_ID_ACTIVE_INDEX,
    sql: `INSERT INTO hold_allocated_item (hold_id, allocation_id, event_id, quantity, status)
          VALUES ('${ids.hold}', '${ids.allocation}', '${ids.event}', 3, 'active')`,
  },
  {
    state: 'one seat twice in one order (I-39)',
    constraint: C.ORDER_ITEM_ORDER_ID_EVENT_SEAT_ID_CONSTRAINT,
    sql: `INSERT INTO order_item (order_id, event_seat_id, quantity, price, currency)
          VALUES ('${ids.order}', '${ids.eventSeat}', 1, 100, 'UAH')`,
  },
  {
    state: 'one quota twice in one order (I-39)',
    constraint: C.ORDER_ITEM_ORDER_ID_ALLOCATION_ID_CONSTRAINT,
    sql: `INSERT INTO order_item (order_id, allocation_id, quantity, price, currency)
          VALUES ('${ids.order}', '${ids.allocation}', 1, 100, 'UAH')`,
  },
  {
    state: 'two tickets with one code',
    constraint: C.TICKET_CODE_CONSTRAINT,
    sql: `INSERT INTO ticket (payment_id, payment_status, allocation_id, ticket_type_id,
                              ticket_price, currency, code)
          VALUES ('${ids.payment}', 'succeeded', '${ids.allocation}', '${ids.ticketType}',
                  100, 'UAH', 'C1')`,
  },
  {
    state: 'a ticket burnt twice (I-30)',
    constraint: C.CHECK_IN_TICKET_ID_CONSTRAINT,
    sql: `INSERT INTO check_in (ticket_id) VALUES ('${ids.ticket}')`,
  },
];

describe('unique keys: the second row is rejected', () => {
  it.each(rejected)('rejects $state ($constraint)', ({ sql, constraint }) =>
    withRollback(async (client) => {
      await seedSale(client);

      await expectViolation(client, sql, SqlState.uniqueViolation, constraint);
    }),
  );
});

/* The other half of a partial index: rows outside its predicate never collide.
   Without these, dropping the WHERE would turn the index into a plain UNIQUE and
   every test above would stay green. */
describe('partial unique indexes: rows outside the predicate are free', () => {
  it(`${C.HOLD_SEAT_ITEM_EVENT_SEAT_ID_ACTIVE_INDEX}: a released item does not occupy the seat`, () =>
    withRollback(async (client) => {
      await seedSale(client);
      await client.query(
        `UPDATE hold_seat_item SET status = 'released' WHERE event_seat_id = '${ids.eventSeat}'`,
      );

      await client.query(`
        WITH h AS (
          INSERT INTO hold (user_id, event_id, status, expires_at)
          VALUES ('${ids.user}', '${ids.event}', 'active', now() + interval '10 minutes')
          RETURNING id)
        INSERT INTO hold_seat_item (hold_id, event_seat_id, event_id, status)
        SELECT id, '${ids.eventSeat}', '${ids.event}', 'active' FROM h`);
    }));

  it(`${C.HOLD_ALLOCATED_ITEM_HOLD_ID_ALLOCATION_ID_ACTIVE_INDEX}: a released item does not block a new one`, () =>
    withRollback(async (client) => {
      await seedSale(client);
      await client.query(
        `UPDATE hold_allocated_item SET status = 'released' WHERE hold_id = '${ids.hold}'`,
      );

      await client.query(
        `INSERT INTO hold_allocated_item (hold_id, allocation_id, event_id, quantity, status)
         VALUES ('${ids.hold}', '${ids.allocation}', '${ids.event}', 3, 'active')`,
      );
    }));

  it(`${C.PAYMENT_ORDER_ID_SUCCEEDED_INDEX}: a second failed attempt is legal`, () =>
    withRollback(async (client) => {
      await seedSale(client);

      await client.query(
        `INSERT INTO payment (order_id, status, idempotency_key, price, currency)
         VALUES ('${ids.order}', 'failed', 'k2', 300, 'UAH')`,
      );
    }));
});
