import { isNull, sql } from 'drizzle-orm';
import {
  check,
  pgTable,
  pgView,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { VENUE_CITY_CHECK, VENUE_NAME_CHECK } from './venue.constraints.js';

export const venue = pgTable(
  'venue',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 255 }).notNull(),
    city: varchar('city', { length: 255 }).notNull(),
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
    check(VENUE_NAME_CHECK, sql`length(btrim(${table.name})) > 0`),
    check(VENUE_CITY_CHECK, sql`length(btrim(${table.city})) > 0`),
  ],
);

export const venueLive = pgView('venue_live').as((qb) =>
  qb.select().from(venue).where(isNull(venue.deletedAt)),
);
