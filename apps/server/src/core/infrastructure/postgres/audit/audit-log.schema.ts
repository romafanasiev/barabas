import { sql } from 'drizzle-orm';
import {
  bigint,
  check,
  index,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { AUDIT_LOG_ACTION_DATA_CHECK } from './audit-log.constraints.js';

export const auditAction = pgEnum('audit_action', [
  'INSERT',
  'UPDATE',
  'DELETE',
]);

/* Written only by the audit_row_change() trigger, see the 0009 migration. */
export const auditLog = pgTable(
  'audit_log',
  {
    id: bigint('id', { mode: 'number' })
      .primaryKey()
      .generatedByDefaultAsIdentity(),
    tableName: text('table_name').notNull(),
    rowId: uuid('row_id').notNull(),
    action: auditAction('action').notNull(),
    oldData: jsonb('old_data'),
    newData: jsonb('new_data'),
    changedAt: timestamp('changed_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    /* No foreign key to "user": the history outlives the account. */
    changedBy: text('changed_by'),
    requestId: uuid('request_id'),
    dbRole: text('db_role')
      .notNull()
      .default(sql`current_user`),
  },
  (table) => [
    index('audit_log_table_name_row_id_changed_at_idx').on(
      table.tableName,
      table.rowId,
      table.changedAt,
    ),

    check(
      AUDIT_LOG_ACTION_DATA_CHECK,
      sql`(${table.action} = 'INSERT' AND ${table.oldData} IS NULL AND ${table.newData} IS NOT NULL)
       OR (${table.action} = 'UPDATE' AND ${table.oldData} IS NOT NULL AND ${table.newData} IS NOT NULL)
       OR (${table.action} = 'DELETE' AND ${table.oldData} IS NOT NULL AND ${table.newData} IS NULL)`,
    ),
  ],
);
