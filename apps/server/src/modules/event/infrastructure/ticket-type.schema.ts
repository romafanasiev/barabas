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
import { currency } from './currency.schema.js';
import { event } from './event.schema.js';
import {
  TICKET_TYPE_CURRENCY_FK,
  TICKET_TYPE_EVENT_ID_FK,
  TICKET_TYPE_EVENT_ID_TYPE_LIVE_INDEX,
  TICKET_TYPE_ID_EVENT_ID_CONSTRAINT,
  TICKET_TYPE_PRICE_CHECK,
  TICKET_TYPE_TYPE_CHECK,
} from './ticket-type.constraints.js';

export const ticketType = pgTable(
  'ticket_type',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    eventId: uuid('event_id').notNull(),
    type: varchar('type', { length: 255 }).notNull(),
    price: numeric('price', { precision: 12, scale: 2 }).notNull(),
    currency: char('currency', { length: 3 }).notNull(),
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
    uniqueIndex(TICKET_TYPE_EVENT_ID_TYPE_LIVE_INDEX)
      .on(table.eventId, table.type)
      .where(sql`${table.deletedAt} IS NULL`),
    unique(TICKET_TYPE_ID_EVENT_ID_CONSTRAINT).on(table.id, table.eventId),

    check(TICKET_TYPE_TYPE_CHECK, sql`length(btrim(${table.type})) > 0`),
    check(TICKET_TYPE_PRICE_CHECK, sql`${table.price} > 0`),

    foreignKey({
      name: TICKET_TYPE_EVENT_ID_FK,
      columns: [table.eventId],
      foreignColumns: [event.id],
    }).onDelete('restrict'),
    foreignKey({
      name: TICKET_TYPE_CURRENCY_FK,
      columns: [table.currency],
      foreignColumns: [currency.code],
    }).onDelete('restrict'),
  ],
);

export const ticketTypeLive = pgView('ticket_type_live').as((qb) =>
  qb.select().from(ticketType).where(isNull(ticketType.deletedAt)),
);
