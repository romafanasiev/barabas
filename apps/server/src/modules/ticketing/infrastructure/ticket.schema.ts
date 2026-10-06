import { isNull, sql } from 'drizzle-orm';
import {
  char,
  check,
  foreignKey,
  numeric,
  pgTable,
  pgView,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { currency } from '../../event/infrastructure/currency.schema.js';
import { eventSeat } from '../../event/infrastructure/event-seat.schema.js';
import { ticketAllocation } from '../../event/infrastructure/ticket-allocation.schema.js';
import { ticketType } from '../../event/infrastructure/ticket-type.schema.js';
import { payment, paymentStatus } from './payment.schema.js';
import {
  TICKET_ALLOCATION_ID_FK,
  TICKET_CODE_CHECK,
  TICKET_CODE_CONSTRAINT,
  TICKET_CURRENCY_FK,
  TICKET_EVENT_SEAT_ID_ALLOCATION_ID_CHECK,
  TICKET_EVENT_SEAT_ID_FK,
  TICKET_EVENT_SEAT_ID_LIVE_INDEX,
  TICKET_PAYMENT_ID_PAYMENT_STATUS_FK,
  TICKET_PAYMENT_STATUS_CHECK,
  TICKET_TICKET_PRICE_CHECK,
  TICKET_TICKET_TYPE_ID_FK,
} from './ticket.constraints.js';

export const ticket = pgTable(
  'ticket',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    paymentId: uuid('payment_id').notNull(),
    /* Discriminator, not a copy for convenience: pinned to 'succeeded' by the CHECK and
       carried into the composite key, it is what makes "no ticket before the money" a
       property of the schema rather than of the code (decision 15). */
    paymentStatus: paymentStatus('payment_status').notNull(),
    eventSeatId: uuid('event_seat_id'),
    allocationId: uuid('allocation_id'),
    ticketTypeId: uuid('ticket_type_id').notNull(),
    ticketPrice: numeric('ticket_price', { precision: 12, scale: 2 }).notNull(),
    currency: char('currency', { length: 3 }).notNull(),
    code: varchar('code', { length: 255 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [
    unique(TICKET_CODE_CONSTRAINT).on(table.code),

    check(
      TICKET_PAYMENT_STATUS_CHECK,
      sql`${table.paymentStatus} = 'succeeded'`,
    ),
    check(
      TICKET_EVENT_SEAT_ID_ALLOCATION_ID_CHECK,
      sql`num_nonnulls(${table.eventSeatId}, ${table.allocationId}) = 1`,
    ),
    check(TICKET_CODE_CHECK, sql`length(btrim(${table.code})) > 0`),
    check(TICKET_TICKET_PRICE_CHECK, sql`${table.ticketPrice} > 0`),

    /* Second line of defence: the first one is the partial index on hold_seat_item, which
       does not let two holds take a seat. This one catches what that never sees — a bug in
       the issuing code, a manual INSERT, a payment processed twice. Quota tickets are not
       affected: NULLs do not collide in a unique index, and there the count is guarded by
       ticket_allocation.sold. A deleted ticket is a refunded one (M1-10). */
    uniqueIndex(TICKET_EVENT_SEAT_ID_LIVE_INDEX)
      .on(table.eventSeatId)
      .where(
        sql`${table.eventSeatId} IS NOT NULL AND ${table.deletedAt} IS NULL`,
      ),

    foreignKey({
      name: TICKET_PAYMENT_ID_PAYMENT_STATUS_FK,
      columns: [table.paymentId, table.paymentStatus],
      foreignColumns: [payment.id, payment.status],
    }).onDelete('restrict'),
    foreignKey({
      name: TICKET_TICKET_TYPE_ID_FK,
      columns: [table.ticketTypeId],
      foreignColumns: [ticketType.id],
    }).onDelete('restrict'),
    foreignKey({
      name: TICKET_CURRENCY_FK,
      columns: [table.currency],
      foreignColumns: [currency.code],
    }).onDelete('restrict'),
    foreignKey({
      name: TICKET_EVENT_SEAT_ID_FK,
      columns: [table.eventSeatId],
      foreignColumns: [eventSeat.id],
    }).onDelete('restrict'),
    foreignKey({
      name: TICKET_ALLOCATION_ID_FK,
      columns: [table.allocationId],
      foreignColumns: [ticketAllocation.id],
    }).onDelete('restrict'),
  ],
);

export const ticketLive = pgView('ticket_live').as((qb) =>
  qb.select().from(ticket).where(isNull(ticket.deletedAt)),
);
