import { sql } from 'drizzle-orm';
import {
  char,
  check,
  foreignKey,
  numeric,
  pgEnum,
  pgTable,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { order } from './order.schema.js';
import {
  PAYMENT_ID_STATUS_CONSTRAINT,
  PAYMENT_IDEMPOTENCY_KEY_CHECK,
  PAYMENT_IDEMPOTENCY_KEY_CONSTRAINT,
  PAYMENT_ORDER_ID_CURRENCY_FK,
  PAYMENT_ORDER_ID_SUCCEEDED_INDEX,
  PAYMENT_PRICE_CHECK,
} from './payment.constraints.js';

export const paymentStatus = pgEnum('payment_status', [
  'pending',
  'succeeded',
  'failed',
]);

export const payment = pgTable(
  'payment',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orderId: uuid('order_id').notNull(),
    status: paymentStatus('status').notNull(),
    /* Taken by the INSERT before the provider is called: that is what makes the second
       request collide here instead of charging the card twice (decision 18). */
    idempotencyKey: varchar('idempotency_key', { length: 255 }).notNull(),
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
    unique(PAYMENT_IDEMPOTENCY_KEY_CONSTRAINT).on(table.idempotencyKey),
    /* Anchor for the ticket's composite key: it is what makes "no ticket before the
       money" a property of the schema (decision 15). */
    unique(PAYMENT_ID_STATUS_CONSTRAINT).on(table.id, table.status),

    /* A second failed attempt is legal, a second successful one is not. */
    uniqueIndex(PAYMENT_ORDER_ID_SUCCEEDED_INDEX)
      .on(table.orderId)
      .where(sql`${table.status} = 'succeeded'`),

    check(
      PAYMENT_IDEMPOTENCY_KEY_CHECK,
      sql`length(btrim(${table.idempotencyKey})) > 0`,
    ),
    check(PAYMENT_PRICE_CHECK, sql`${table.price} > 0`),

    foreignKey({
      name: PAYMENT_ORDER_ID_CURRENCY_FK,
      columns: [table.orderId, table.currency],
      foreignColumns: [order.id, order.currency],
    }).onDelete('restrict'),
  ],
);
