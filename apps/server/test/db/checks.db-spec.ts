import { ids, seedSale } from '../../utils/tests/db/catalog.fixture.js';
import * as C from '../../utils/tests/db/constraints.js';
import {
  expectViolation,
  SqlState,
  withRollback,
} from '../../utils/tests/db/db.helpers.js';

/* Rows of docs/db/impossible-states.md. Each statement starts from a valid sale
   and breaks exactly one CHECK: when a row breaks two, PostgreSQL reports the
   first by name, and the test would be checking alphabetical order. */
type Case = { state: string; constraint: string; sql: string };

const fromMigrations03to05: Case[] = [
  {
    state: 'a seat in a standing section',
    constraint: C.SEAT_SECTION_TYPE_CHECK,
    sql: `INSERT INTO seat (section_id, row_no, seat_number, section_type, venue_id)
          VALUES ('${ids.standingSection}', 9, 9, 'standing', '${ids.venue}')`,
  },
  {
    state: 'a quota in a numbered section',
    constraint: C.TICKET_ALLOCATION_SECTION_TYPE_CHECK,
    sql: `INSERT INTO ticket_allocation (event_id, section_id, ticket_type_id, venue_id,
                                         section_type, section_capacity, capacity)
          VALUES ('${ids.event}', '${ids.numberedSection}', '${ids.ticketType}',
                  '${ids.venue}', 'numbered', 100, 10)`,
  },
  {
    state: 'held + sold > capacity',
    constraint: C.TICKET_ALLOCATION_HELD_SOLD_CAPACITY_CHECK,
    sql: `UPDATE ticket_allocation SET sold = capacity - held + 1
          WHERE id = '${ids.allocation}'`,
  },
  {
    state: 'held < 0',
    constraint: C.TICKET_ALLOCATION_HELD_CHECK,
    sql: `UPDATE ticket_allocation SET held = -1 WHERE id = '${ids.allocation}'`,
  },
  {
    state: 'sold < 0',
    constraint: C.TICKET_ALLOCATION_SOLD_CHECK,
    sql: `UPDATE ticket_allocation SET sold = -1 WHERE id = '${ids.allocation}'`,
  },
  {
    state: 'a quota larger than its section',
    constraint: C.TICKET_ALLOCATION_CAPACITY_CHECK,
    sql: `UPDATE ticket_allocation SET capacity = section_capacity + 1
          WHERE id = '${ids.allocation}'`,
  },
  {
    state: 'a hold that expires no later than it was created',
    constraint: C.HOLD_EXPIRES_AT_CREATED_AT_CHECK,
    sql: `UPDATE hold SET expires_at = created_at WHERE id = '${ids.hold}'`,
  },
  {
    state: 'an order that expires no later than it was created',
    constraint: C.ORDER_EXPIRES_AT_CREATED_AT_CHECK,
    sql: `UPDATE "order" SET expires_at = created_at WHERE id = '${ids.order}'`,
  },
  {
    state: 'an order item pointing at a seat and a quota at once',
    constraint: C.ORDER_ITEM_EVENT_SEAT_ID_ALLOCATION_ID_CHECK,
    sql: `UPDATE order_item SET event_seat_id = '${ids.eventSeat}'
          WHERE allocation_id = '${ids.allocation}'`,
  },
  {
    state: 'a seat order item with quantity other than 1',
    constraint: C.ORDER_ITEM_QUANTITY_CHECK,
    sql: `UPDATE order_item SET quantity = 2
          WHERE event_seat_id = '${ids.eventSeat}'`,
  },
  {
    state: 'a ticket pointing at a seat and a quota at once',
    constraint: C.TICKET_EVENT_SEAT_ID_ALLOCATION_ID_CHECK,
    sql: `UPDATE ticket SET allocation_id = '${ids.allocation}'
          WHERE id = '${ids.ticket}'`,
  },
  {
    state: 'a ticket for a payment that did not succeed',
    constraint: C.TICKET_PAYMENT_STATUS_CHECK,
    sql: `INSERT INTO ticket (payment_id, payment_status, allocation_id, ticket_type_id,
                              ticket_price, currency, code)
          VALUES ('${ids.failedPayment}', 'failed', '${ids.allocation}',
                  '${ids.ticketType}', 100, 'UAH', 'C9')`,
  },
];

const fromMigration06: Case[] = [
  {
    state: 'a currency code that is not three capital letters',
    constraint: C.CURRENCY_CODE_CHECK,
    sql: `INSERT INTO currency (code, name) VALUES ('usd', 'Dollar')`,
  },
  {
    state: 'a blank currency name',
    constraint: C.CURRENCY_NAME_CHECK,
    sql: `INSERT INTO currency (code, name) VALUES ('EUR', '   ')`,
  },
  {
    state: 'a blank artist',
    constraint: C.EVENT_ARTIST_CHECK,
    sql: `UPDATE event SET artist = '   ' WHERE id = '${ids.event}'`,
  },
  {
    state: 'an event ending no later than it starts',
    constraint: C.EVENT_ENDS_AT_STARTS_AT_CHECK,
    sql: `UPDATE event SET ends_at = starts_at WHERE id = '${ids.event}'`,
  },
  {
    state: 'a quota of zero',
    constraint: C.TICKET_ALLOCATION_CAPACITY_POSITIVE_CHECK,
    sql: `UPDATE ticket_allocation SET capacity = 0, held = 0
          WHERE id = '${ids.allocation}'`,
  },
  {
    state: 'a blank ticket type name',
    constraint: C.TICKET_TYPE_TYPE_CHECK,
    sql: `UPDATE ticket_type SET type = '   ' WHERE id = '${ids.ticketType}'`,
  },
  {
    state: 'a ticket type price <= 0',
    constraint: C.TICKET_TYPE_PRICE_CHECK,
    sql: `UPDATE ticket_type SET price = 0 WHERE id = '${ids.ticketType}'`,
  },
  {
    state: 'a quota hold item with quantity <= 0',
    constraint: C.HOLD_ALLOCATED_ITEM_QUANTITY_CHECK,
    sql: `UPDATE hold_allocated_item SET quantity = 0 WHERE hold_id = '${ids.hold}'`,
  },
  {
    state: 'an order item price <= 0',
    constraint: C.ORDER_ITEM_PRICE_CHECK,
    sql: `UPDATE order_item SET price = 0 WHERE order_id = '${ids.order}'`,
  },
  {
    state: 'a blank idempotency key',
    constraint: C.PAYMENT_IDEMPOTENCY_KEY_CHECK,
    sql: `UPDATE payment SET idempotency_key = '   ' WHERE id = '${ids.payment}'`,
  },
  {
    state: 'a payment amount <= 0',
    constraint: C.PAYMENT_PRICE_CHECK,
    sql: `UPDATE payment SET price = 0 WHERE id = '${ids.failedPayment}'`,
  },
  {
    state: 'a blank ticket code',
    constraint: C.TICKET_CODE_CHECK,
    sql: `UPDATE ticket SET code = '   ' WHERE id = '${ids.ticket}'`,
  },
  {
    state: 'a ticket price <= 0',
    constraint: C.TICKET_TICKET_PRICE_CHECK,
    sql: `UPDATE ticket SET ticket_price = 0 WHERE id = '${ids.ticket}'`,
  },
  {
    state: 'a row number <= 0',
    constraint: C.SEAT_ROW_NO_CHECK,
    sql: `UPDATE seat SET row_no = 0 WHERE id = '${ids.seat}'`,
  },
  {
    state: 'a seat number <= 0',
    constraint: C.SEAT_SEAT_NUMBER_CHECK,
    sql: `UPDATE seat SET seat_number = 0 WHERE id = '${ids.seat}'`,
  },
  {
    state: 'a blank section label',
    constraint: C.SECTION_LABEL_CHECK,
    sql: `UPDATE section SET label = '   ' WHERE id = '${ids.numberedSection}'`,
  },
  {
    state: 'a section capacity <= 0',
    constraint: C.SECTION_CAPACITY_CHECK,
    sql: `UPDATE section SET capacity = 0 WHERE id = '${ids.numberedSection}'`,
  },
  {
    state: 'a blank venue name',
    constraint: C.VENUE_NAME_CHECK,
    sql: `UPDATE venue SET name = '   ' WHERE id = '${ids.venue}'`,
  },
  {
    state: 'a blank venue city',
    constraint: C.VENUE_CITY_CHECK,
    sql: `UPDATE venue SET city = '   ' WHERE id = '${ids.venue}'`,
  },
];

describe.each([
  [
    'impossible-states, section 1: CHECK from M1-03..M1-05',
    fromMigrations03to05,
  ],
  ['impossible-states, section 2: CHECK from M1-06', fromMigration06],
])('%s', (_, cases) => {
  it.each(cases)('rejects $state ($constraint)', ({ sql, constraint }) =>
    withRollback(async (client) => {
      await seedSale(client);

      await expectViolation(client, sql, SqlState.checkViolation, constraint);
    }),
  );
});
