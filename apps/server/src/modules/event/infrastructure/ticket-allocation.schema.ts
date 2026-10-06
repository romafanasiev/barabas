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
  section,
  sectionType,
} from '../../venue/infrastructure/section.schema.js';
import { event } from './event.schema.js';
import {
  TICKET_ALLOCATION_CAPACITY_CHECK,
  TICKET_ALLOCATION_CAPACITY_POSITIVE_CHECK,
  TICKET_ALLOCATION_EVENT_ID_SECTION_ID_LIVE_INDEX,
  TICKET_ALLOCATION_ID_EVENT_ID_CONSTRAINT,
  TICKET_ALLOCATION_EVENT_ID_VENUE_ID_FK,
  TICKET_ALLOCATION_HELD_CHECK,
  TICKET_ALLOCATION_HELD_SOLD_CAPACITY_CHECK,
  TICKET_ALLOCATION_SECTION_ID_SECTION_CAPACITY_FK,
  TICKET_ALLOCATION_SECTION_ID_SECTION_TYPE_FK,
  TICKET_ALLOCATION_SECTION_ID_VENUE_ID_FK,
  TICKET_ALLOCATION_SECTION_TYPE_CHECK,
  TICKET_ALLOCATION_SOLD_CHECK,
  TICKET_ALLOCATION_TICKET_TYPE_ID_EVENT_ID_FK,
} from './ticket-allocation.constraints.js';
import { ticketType } from './ticket-type.schema.js';

export const ticketAllocation = pgTable(
  'ticket_allocation',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    eventId: uuid('event_id').notNull(),
    sectionId: uuid('section_id').notNull(),
    ticketTypeId: uuid('ticket_type_id').notNull(),
    venueId: uuid('venue_id').notNull(),
    sectionType: sectionType('section_type').notNull(),
    sectionCapacity: integer('section_capacity').notNull(),
    capacity: integer('capacity').notNull(),
    held: integer('held').notNull().default(0),
    sold: integer('sold').notNull().default(0),
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
    uniqueIndex(TICKET_ALLOCATION_EVENT_ID_SECTION_ID_LIVE_INDEX)
      .on(table.eventId, table.sectionId)
      .where(sql`${table.deletedAt} IS NULL`),
    unique(TICKET_ALLOCATION_ID_EVENT_ID_CONSTRAINT).on(
      table.id,
      table.eventId,
    ),

    check(
      TICKET_ALLOCATION_HELD_SOLD_CAPACITY_CHECK,
      sql`${table.held} + ${table.sold} <= ${table.capacity}`,
    ),
    check(TICKET_ALLOCATION_HELD_CHECK, sql`${table.held} >= 0`),
    check(TICKET_ALLOCATION_SOLD_CHECK, sql`${table.sold} >= 0`),
    check(
      TICKET_ALLOCATION_CAPACITY_CHECK,
      sql`${table.capacity} <= ${table.sectionCapacity}`,
    ),
    check(
      TICKET_ALLOCATION_CAPACITY_POSITIVE_CHECK,
      sql`${table.capacity} > 0`,
    ),
    check(
      TICKET_ALLOCATION_SECTION_TYPE_CHECK,
      sql`${table.sectionType} = 'standing'`,
    ),

    /* ON UPDATE CASCADE belongs to this key and to no other: a hall is legitimately
       resized, and the copy has to follow. Shrinking it under an open quota makes the
       cascaded UPDATE fail the capacity CHECK, and the whole statement rolls back. */
    foreignKey({
      name: TICKET_ALLOCATION_SECTION_ID_SECTION_CAPACITY_FK,
      columns: [table.sectionId, table.sectionCapacity],
      foreignColumns: [section.id, section.capacity],
    })
      .onUpdate('cascade')
      .onDelete('restrict'),

    foreignKey({
      name: TICKET_ALLOCATION_SECTION_ID_SECTION_TYPE_FK,
      columns: [table.sectionId, table.sectionType],
      foreignColumns: [section.id, section.type],
    }).onDelete('restrict'),
    foreignKey({
      name: TICKET_ALLOCATION_SECTION_ID_VENUE_ID_FK,
      columns: [table.sectionId, table.venueId],
      foreignColumns: [section.id, section.venueId],
    }).onDelete('restrict'),
    foreignKey({
      name: TICKET_ALLOCATION_EVENT_ID_VENUE_ID_FK,
      columns: [table.eventId, table.venueId],
      foreignColumns: [event.id, event.venueId],
    }).onDelete('restrict'),
    foreignKey({
      name: TICKET_ALLOCATION_TICKET_TYPE_ID_EVENT_ID_FK,
      columns: [table.ticketTypeId, table.eventId],
      foreignColumns: [ticketType.id, ticketType.eventId],
    }).onDelete('restrict'),
  ],
);

export const ticketAllocationLive = pgView('ticket_allocation_live').as((qb) =>
  qb.select().from(ticketAllocation).where(isNull(ticketAllocation.deletedAt)),
);
