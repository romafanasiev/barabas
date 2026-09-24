import {
  foreignKey,
  pgTable,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';
import {
  CHECK_IN_TICKET_ID_CONSTRAINT,
  CHECK_IN_TICKET_ID_FK,
} from './check-in.constraints.js';
import { ticket } from './ticket.schema.js';

export const checkIn = pgTable(
  'check_in',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    ticketId: uuid('ticket_id').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    /* "Burnt exactly once" is this key: the fact lives in the existence of the row, and
       there is no status column that could disagree with it. */
    unique(CHECK_IN_TICKET_ID_CONSTRAINT).on(table.ticketId),

    foreignKey({
      name: CHECK_IN_TICKET_ID_FK,
      columns: [table.ticketId],
      foreignColumns: [ticket.id],
    }).onDelete('cascade'),
  ],
);
