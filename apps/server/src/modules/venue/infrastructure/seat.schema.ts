import { sql } from 'drizzle-orm';
import {
  check,
  foreignKey,
  integer,
  pgTable,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';
import {
  SEAT_SECTION_ID_ROW_NO_SEAT_NUMBER_CONSTRAINT,
  SEAT_SECTION_ID_SECTION_TYPE_FK,
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
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    unique(SEAT_SECTION_ID_ROW_NO_SEAT_NUMBER_CONSTRAINT).on(
      table.sectionId,
      table.rowNo,
      table.seatNumber,
    ),
    check(SEAT_SECTION_TYPE_CHECK, sql`${table.sectionType} = 'numbered'`),
    /* RESTRICT: a section cannot be dropped while it still has seats. Seats carry no
       sale state themselves, but event_seat and ticket hang off them (M1-04, M1-05),
       and a deleted venue must never take a sold ticket with it. */
    foreignKey({
      name: SEAT_SECTION_ID_SECTION_TYPE_FK,
      columns: [table.sectionId, table.sectionType],
      foreignColumns: [section.id, section.type],
    }).onDelete('restrict'),
  ],
);
