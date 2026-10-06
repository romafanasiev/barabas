import { isNull, sql } from 'drizzle-orm';
import {
  check,
  foreignKey,
  integer,
  pgTable,
  pgView,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import {
  SEAT_ID_VENUE_ID_CONSTRAINT,
  SEAT_ROW_NO_CHECK,
  SEAT_SEAT_NUMBER_CHECK,
  SEAT_SECTION_ID_ROW_NO_SEAT_NUMBER_LIVE_INDEX,
  SEAT_SECTION_ID_SECTION_TYPE_FK,
  SEAT_SECTION_ID_VENUE_ID_FK,
  SEAT_SECTION_TYPE_CHECK,
} from './seat.constraints.js';
import { section, sectionType } from './section.schema.js';

export const seat = pgTable(
  'seat',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sectionId: uuid('section_id').notNull(),
    rowNo: integer('row_no').notNull(),
    seatNumber: integer('seat_number').notNull(),
    sectionType: sectionType('section_type').notNull(),
    venueId: uuid('venue_id').notNull(),
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
    uniqueIndex(SEAT_SECTION_ID_ROW_NO_SEAT_NUMBER_LIVE_INDEX)
      .on(table.sectionId, table.rowNo, table.seatNumber)
      .where(sql`${table.deletedAt} IS NULL`),
    check(SEAT_SECTION_TYPE_CHECK, sql`${table.sectionType} = 'numbered'`),
    check(SEAT_ROW_NO_CHECK, sql`${table.rowNo} > 0`),
    check(SEAT_SEAT_NUMBER_CHECK, sql`${table.seatNumber} > 0`),

    foreignKey({
      name: SEAT_SECTION_ID_SECTION_TYPE_FK,
      columns: [table.sectionId, table.sectionType],
      foreignColumns: [section.id, section.type],
    }).onDelete('restrict'),

    foreignKey({
      name: SEAT_SECTION_ID_VENUE_ID_FK,
      columns: [table.sectionId, table.venueId],
      foreignColumns: [section.id, section.venueId],
    }).onDelete('restrict'),

    unique(SEAT_ID_VENUE_ID_CONSTRAINT).on(table.id, table.venueId),
  ],
);

export const seatLive = pgView('seat_live').as((qb) =>
  qb.select().from(seat).where(isNull(seat.deletedAt)),
);
