import {
  foreignKey,
  pgTable,
  timestamp,
  unique,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { venue } from '../../venue/infrastructure/venue.schema.js';
import {
  EVENT_ID_VENUE_ID_CONSTRAINT,
  EVENT_VENUE_ID_FK,
} from './event.constraints.js';

export const event = pgTable(
  'event',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    venueId: uuid('venue_id').notNull(),
    artist: varchar('artist', { length: 255 }).notNull(),
    startsAt: timestamp('starts_at', { withTimezone: true }).notNull(),
    endsAt: timestamp('ends_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    unique(EVENT_ID_VENUE_ID_CONSTRAINT).on(table.id, table.venueId),

    foreignKey({
      name: EVENT_VENUE_ID_FK,
      columns: [table.venueId],
      foreignColumns: [venue.id],
    }).onDelete('restrict'),
  ],
);
