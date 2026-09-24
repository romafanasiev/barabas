import { sql } from 'drizzle-orm';
import {
  check,
  foreignKey,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';
import { user } from '../../../core/auth/auth.schema.js';
import { event } from '../../event/infrastructure/event.schema.js';
import {
  HOLD_EVENT_ID_FK,
  HOLD_EXPIRES_AT_CREATED_AT_CHECK,
  HOLD_ID_EVENT_ID_CONSTRAINT,
  HOLD_USER_ID_FK,
} from './hold.constraints.js';

export const holdStatus = pgEnum('hold_status', [
  'active',
  'confirmed',
  'expired',
  'cancelled',
]);

/* One enum for both item tables: the values are the same, only the subject differs. */
export const holdItemStatus = pgEnum('hold_item_status', [
  'active',
  'released',
]);

export const hold = pgTable(
  'hold',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    /* text, not uuid: the column points at better-auth's generated `user.id`. */
    userId: text('user_id').notNull(),
    eventId: uuid('event_id').notNull(),
    status: holdStatus('status').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    /* Not about uniqueness — `id` is already the key. It exists so that the composite
       foreign keys of both item tables have something to point at (I-37). */
    unique(HOLD_ID_EVENT_ID_CONSTRAINT).on(table.id, table.eventId),

    check(
      HOLD_EXPIRES_AT_CREATED_AT_CHECK,
      sql`${table.expiresAt} > ${table.createdAt}`,
    ),

    foreignKey({
      name: HOLD_USER_ID_FK,
      columns: [table.userId],
      foreignColumns: [user.id],
    }).onDelete('restrict'),
    foreignKey({
      name: HOLD_EVENT_ID_FK,
      columns: [table.eventId],
      foreignColumns: [event.id],
    }).onDelete('restrict'),
  ],
);
