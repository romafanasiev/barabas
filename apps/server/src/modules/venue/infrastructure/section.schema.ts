import { isNull, sql } from 'drizzle-orm';
import {
  check,
  foreignKey,
  integer,
  pgEnum,
  pgTable,
  pgView,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import {
  SECTION_CAPACITY_CHECK,
  SECTION_ID_CAPACITY_CONSTRAINT,
  SECTION_ID_VENUE_ID_CONSTRAINT,
  SECTION_ID_TYPE_CONSTRAINT,
  SECTION_LABEL_CHECK,
  SECTION_VENUE_ID_FK,
  SECTION_VENUE_ID_LABEL_LIVE_INDEX,
} from './section.constraints.js';
import { venue } from './venue.schema.js';

export const sectionType = pgEnum('section_type', ['numbered', 'standing']);

export const section = pgTable(
  'section',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    label: varchar('label', { length: 255 }).notNull(),
    capacity: integer('capacity').notNull(),
    venueId: uuid('venue_id').notNull(),
    type: sectionType('type').notNull(),
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
    foreignKey({
      name: SECTION_VENUE_ID_FK,
      columns: [table.venueId],
      foreignColumns: [venue.id],
    }).onDelete('restrict'),

    uniqueIndex(SECTION_VENUE_ID_LABEL_LIVE_INDEX)
      .on(table.venueId, table.label)
      .where(sql`${table.deletedAt} IS NULL`),

    unique(SECTION_ID_TYPE_CONSTRAINT).on(table.id, table.type),
    unique(SECTION_ID_CAPACITY_CONSTRAINT).on(table.id, table.capacity),
    unique(SECTION_ID_VENUE_ID_CONSTRAINT).on(table.id, table.venueId),

    check(SECTION_LABEL_CHECK, sql`length(btrim(${table.label})) > 0`),
    check(SECTION_CAPACITY_CHECK, sql`${table.capacity} > 0`),
  ],
);

export const sectionLive = pgView('section_live').as((qb) =>
  qb.select().from(section).where(isNull(section.deletedAt)),
);
