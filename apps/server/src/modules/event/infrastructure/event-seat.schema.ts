import {
  foreignKey,
  pgTable,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';
import { seat } from '../../venue/infrastructure/seat.schema.js';
import {
  EVENT_SEAT_EVENT_ID_VENUE_ID_FK,
  EVENT_SEAT_ID_EVENT_ID_CONSTRAINT,
  EVENT_SEAT_SEAT_ID_EVENT_ID_CONSTRAINT,
  EVENT_SEAT_SEAT_ID_VENUE_ID_FK,
  EVENT_SEAT_TICKET_TYPE_ID_EVENT_ID_FK,
} from './event-seat.constraints.js';
import { event } from './event.schema.js';
import { ticketType } from './ticket-type.schema.js';

export const eventSeat = pgTable(
  'event_seat',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    eventId: uuid('event_id').notNull(),
    seatId: uuid('seat_id').notNull(),
    ticketTypeId: uuid('ticket_type_id').notNull(),
    venueId: uuid('venue_id').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    unique(EVENT_SEAT_SEAT_ID_EVENT_ID_CONSTRAINT).on(
      table.seatId,
      table.eventId,
    ),
    unique(EVENT_SEAT_ID_EVENT_ID_CONSTRAINT).on(table.id, table.eventId),

    foreignKey({
      name: EVENT_SEAT_EVENT_ID_VENUE_ID_FK,
      columns: [table.eventId, table.venueId],
      foreignColumns: [event.id, event.venueId],
    }).onDelete('restrict'),
    foreignKey({
      name: EVENT_SEAT_SEAT_ID_VENUE_ID_FK,
      columns: [table.seatId, table.venueId],
      foreignColumns: [seat.id, seat.venueId],
    }).onDelete('restrict'),
    foreignKey({
      name: EVENT_SEAT_TICKET_TYPE_ID_EVENT_ID_FK,
      columns: [table.ticketTypeId, table.eventId],
      foreignColumns: [ticketType.id, ticketType.eventId],
    }).onDelete('restrict'),
  ],
);
