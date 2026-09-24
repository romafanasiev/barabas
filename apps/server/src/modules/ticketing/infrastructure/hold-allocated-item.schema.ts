import { sql } from 'drizzle-orm';
import {
  foreignKey,
  integer,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { ticketAllocation } from '../../event/infrastructure/ticket-allocation.schema.js';
import {
  HOLD_ALLOCATED_ITEM_ALLOCATION_ID_EVENT_ID_FK,
  HOLD_ALLOCATED_ITEM_HOLD_ID_ALLOCATION_ID_ACTIVE_INDEX,
  HOLD_ALLOCATED_ITEM_HOLD_ID_EVENT_ID_FK,
} from './hold-allocated-item.constraints.js';
import { hold, holdItemStatus } from './hold.schema.js';

export const holdAllocatedItem = pgTable(
  'hold_allocated_item',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    holdId: uuid('hold_id').notNull(),
    allocationId: uuid('allocation_id').notNull(),
    /* Copy of the hold's event, discriminator for both composite keys below (I-37). */
    eventId: uuid('event_id').notNull(),
    quantity: integer('quantity').notNull(),
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
    /* Collapses "two entries and then three more" into one row per quota per hold.
       It does NOT guard capacity: that is CHECK (held + sold <= capacity) on the
       counter row, and these are tools of different strength. */
    uniqueIndex(HOLD_ALLOCATED_ITEM_HOLD_ID_ALLOCATION_ID_ACTIVE_INDEX)
      .on(table.holdId, table.allocationId)
      .where(sql`${table.status} = 'active'`),

    foreignKey({
      name: HOLD_ALLOCATED_ITEM_HOLD_ID_EVENT_ID_FK,
      columns: [table.holdId, table.eventId],
      foreignColumns: [hold.id, hold.eventId],
    }).onDelete('cascade'),
    foreignKey({
      name: HOLD_ALLOCATED_ITEM_ALLOCATION_ID_EVENT_ID_FK,
      columns: [table.allocationId, table.eventId],
      foreignColumns: [ticketAllocation.id, ticketAllocation.eventId],
    }).onDelete('restrict'),
  ],
);
