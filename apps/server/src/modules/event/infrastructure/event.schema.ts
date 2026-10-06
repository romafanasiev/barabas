import { isNull, sql } from 'drizzle-orm';
import {
  check,
  foreignKey,
  pgTable,
  pgView,
  timestamp,
  unique,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { venue } from '../../venue/infrastructure/venue.schema.js';
import {
  EVENT_ARTIST_CHECK,
  EVENT_ENDS_AT_STARTS_AT_CHECK,
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
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [
    unique(EVENT_ID_VENUE_ID_CONSTRAINT).on(table.id, table.venueId),

    check(EVENT_ARTIST_CHECK, sql`length(btrim(${table.artist})) > 0`),
    check(
      EVENT_ENDS_AT_STARTS_AT_CHECK,
      sql`${table.endsAt} > ${table.startsAt}`,
    ),

    foreignKey({
      name: EVENT_VENUE_ID_FK,
      columns: [table.venueId],
      foreignColumns: [venue.id],
    }).onDelete('restrict'),
  ],
);

export const eventLive = pgView('event_live').as((qb) =>
  qb.select().from(event).where(isNull(event.deletedAt)),
);
