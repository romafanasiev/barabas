import { sql } from 'drizzle-orm';
import {
  char,
  check,
  foreignKey,
  pgEnum,
  pgTable,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';
import { currency } from '../../event/infrastructure/currency.schema.js';
import { hold } from './hold.schema.js';
import {
  ORDER_CURRENCY_FK,
  ORDER_EXPIRES_AT_CREATED_AT_CHECK,
  ORDER_HOLD_ID_CONSTRAINT,
  ORDER_HOLD_ID_FK,
  ORDER_ID_CURRENCY_CONSTRAINT,
} from './order.constraints.js';

export const orderStatus = pgEnum('order_status', [
  'pending',
  'paid',
  'cancelled',
  'expired',
  'refunded',
]);

export const order = pgTable(
  'order',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    holdId: uuid('hold_id').notNull(),
    status: orderStatus('status').notNull(),
    currency: char('currency', { length: 3 }).notNull(),
    /* Second lifetime: the hold is terminal once confirmed, so from here on it is the
       order that expires and releases the positions. */
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    unique(ORDER_HOLD_ID_CONSTRAINT).on(table.holdId),
    /* Anchor for the composite keys of `order_item` and `payment`: one currency per
       order, and the children cannot disagree with it. */
    unique(ORDER_ID_CURRENCY_CONSTRAINT).on(table.id, table.currency),

    check(
      ORDER_EXPIRES_AT_CREATED_AT_CHECK,
      sql`${table.expiresAt} > ${table.createdAt}`,
    ),

    foreignKey({
      name: ORDER_HOLD_ID_FK,
      columns: [table.holdId],
      foreignColumns: [hold.id],
    }).onDelete('restrict'),
    foreignKey({
      name: ORDER_CURRENCY_FK,
      columns: [table.currency],
      foreignColumns: [currency.code],
    }).onDelete('restrict'),
  ],
);
