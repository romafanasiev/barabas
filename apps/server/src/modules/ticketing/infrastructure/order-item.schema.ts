import { sql } from 'drizzle-orm';
import {
  char,
  check,
  foreignKey,
  integer,
  numeric,
  pgTable,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { eventSeat } from '../../event/infrastructure/event-seat.schema.js';
import { ticketAllocation } from '../../event/infrastructure/ticket-allocation.schema.js';
import { order } from './order.schema.js';
import {
  ORDER_ITEM_ALLOCATION_ID_FK,
  ORDER_ITEM_EVENT_SEAT_ID_ALLOCATION_ID_CHECK,
  ORDER_ITEM_EVENT_SEAT_ID_FK,
  ORDER_ITEM_ORDER_ID_CURRENCY_FK,
  ORDER_ITEM_QUANTITY_CHECK,
} from './order-item.constraints.js';

export const orderItem = pgTable(
  'order_item',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orderId: uuid('order_id').notNull(),
    eventSeatId: uuid('event_seat_id'),
    allocationId: uuid('allocation_id'),
    quantity: integer('quantity').notNull(),
    /* Copied from ticket_type at confirmation time: a later price change must not
       rewrite what was bought (decision 8). */
    price: numeric('price', { precision: 12, scale: 2 }).notNull(),
    currency: char('currency', { length: 3 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    check(
      ORDER_ITEM_EVENT_SEAT_ID_ALLOCATION_ID_CHECK,
      sql`num_nonnulls(${table.eventSeatId}, ${table.allocationId}) = 1`,
    ),
    check(
      ORDER_ITEM_QUANTITY_CHECK,
      sql`(${table.eventSeatId} IS NOT NULL AND ${table.quantity} = 1)
          OR (${table.allocationId} IS NOT NULL AND ${table.quantity} >= 1)`,
    ),

    foreignKey({
      name: ORDER_ITEM_ORDER_ID_CURRENCY_FK,
      columns: [table.orderId, table.currency],
      foreignColumns: [order.id, order.currency],
    }).onDelete('cascade'),
    foreignKey({
      name: ORDER_ITEM_EVENT_SEAT_ID_FK,
      columns: [table.eventSeatId],
      foreignColumns: [eventSeat.id],
    }).onDelete('restrict'),
    foreignKey({
      name: ORDER_ITEM_ALLOCATION_ID_FK,
      columns: [table.allocationId],
      foreignColumns: [ticketAllocation.id],
    }).onDelete('restrict'),
  ],
);
