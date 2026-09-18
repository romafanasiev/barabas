import {
  foreignKey,
  integer,
  pgEnum,
  pgTable,
  timestamp,
  unique,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import {
  SECTION_ID_CAPACITY_CONSTRAINT,
  SECTION_ID_TYPE_CONSTRAINT,
  SECTION_VENUE_ID_FK,
  SECTION_VENUE_ID_LABEL_CONSTRAINT,
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
  },
  (table) => [
    /* RESTRICT, not CASCADE: a venue must not be erasable while anything hangs off
       it. The chain venue -> section -> seat -> event_seat -> ticket ends in sold
       tickets, which stay in the database so refunds remain possible. CASCADE here
       would move that safety onto every link below, and hold only until one of them
       is written as CASCADE too. Price: a draft venue is deleted bottom-up, and
       until M1-10 decides on soft delete, `docker compose down -v` is the way to
       reset a dev database. */
    foreignKey({
      name: SECTION_VENUE_ID_FK,
      columns: [table.venueId],
      foreignColumns: [venue.id],
    }).onDelete('restrict'),

    unique(SECTION_VENUE_ID_LABEL_CONSTRAINT).on(table.venueId, table.label),

    /* The two keys below are redundant for `section` itself: `id` is already the
       primary key, so neither can ever reject a row. They exist for child tables,
       because PostgreSQL lets a composite foreign key point only at columns covered
       by a unique constraint.

       (id, type) backs `seat (section_id, section_type)` and, from M1-04,
       `ticket_allocation` — each child carries a CHECK pinning its own type, so a
       numbered section can hold seats and a standing one a quota, never both
       (decision 9, states-and-invariants.md).

       (id, capacity) backs `ticket_allocation (section_id, section_capacity)` with
       ON UPDATE CASCADE, which keeps a quota from exceeding the capacity of its
       section and re-syncs the copy when the hall is resized (decision 5).

       Remove either one and the migration that needs it cannot be written without
       first editing a migration that has already been applied. */
    unique(SECTION_ID_TYPE_CONSTRAINT).on(table.id, table.type),
    unique(SECTION_ID_CAPACITY_CONSTRAINT).on(table.id, table.capacity),
  ],
);
