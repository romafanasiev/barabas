import {
  char,
  foreignKey,
  numeric,
  pgTable,
  timestamp,
  unique,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { currency } from './currency.schema.js';
import { event } from './event.schema.js';
import {
  TICKET_TYPE_CURRENCY_FK,
  TICKET_TYPE_EVENT_ID_FK,
  TICKET_TYPE_EVENT_ID_TYPE_CONSTRAINT,
  TICKET_TYPE_ID_EVENT_ID_CONSTRAINT,
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
  },
  (table) => [
    unique(TICKET_TYPE_EVENT_ID_TYPE_CONSTRAINT).on(table.eventId, table.type),
    unique(TICKET_TYPE_ID_EVENT_ID_CONSTRAINT).on(table.id, table.eventId),

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
