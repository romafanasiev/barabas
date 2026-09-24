import { sql } from 'drizzle-orm';
import {
  foreignKey,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { eventSeat } from '../../event/infrastructure/event-seat.schema.js';
import {
  HOLD_SEAT_ITEM_EVENT_SEAT_ID_ACTIVE_INDEX,
  HOLD_SEAT_ITEM_EVENT_SEAT_ID_EVENT_ID_FK,
  HOLD_SEAT_ITEM_HOLD_ID_EVENT_ID_FK,
} from './hold-seat-item.constraints.js';
import { hold, holdItemStatus } from './hold.schema.js';

export const holdSeatItem = pgTable(
  'hold_seat_item',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    holdId: uuid('hold_id').notNull(),
    eventSeatId: uuid('event_seat_id').notNull(),
    /* Copy of the hold's event, discriminator for both composite keys below (I-37). */
    eventId: uuid('event_id').notNull(),
    status: holdItemStatus('status').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    /* `active` here means "this row occupies the seat", not "the hold is still alive":
       the row stays active after the hold is confirmed and after the ticket is issued,
       otherwise the seat would be free for an instant between the two. */
    uniqueIndex(HOLD_SEAT_ITEM_EVENT_SEAT_ID_ACTIVE_INDEX)
      .on(table.eventSeatId)
      .where(sql`${table.status} = 'active'`),

    foreignKey({
      name: HOLD_SEAT_ITEM_HOLD_ID_EVENT_ID_FK,
      columns: [table.holdId, table.eventId],
      foreignColumns: [hold.id, hold.eventId],
    }).onDelete('cascade'),
    foreignKey({
      name: HOLD_SEAT_ITEM_EVENT_SEAT_ID_EVENT_ID_FK,
      columns: [table.eventSeatId, table.eventId],
      foreignColumns: [eventSeat.id, eventSeat.eventId],
    }).onDelete('restrict'),
  ],
);
