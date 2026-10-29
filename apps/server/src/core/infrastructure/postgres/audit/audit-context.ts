import { sql } from 'drizzle-orm';
import type { DbOrTx } from '../db.types.js';

export type AuditContext = {
  userId: string | null;
  requestId: string | null;
};

/* The audit trigger cannot see the request: it reads these two settings instead.
   They are transaction-local, so call this inside the transaction that does the
   write. Outside one they are gone after the statement, and the row gets nulls. */
export async function setAuditContext(
  db: DbOrTx,
  context: AuditContext,
): Promise<void> {
  await db.execute(
    sql`SELECT set_config('app.user_id', ${context.userId ?? ''}, true),
               set_config('app.request_id', ${context.requestId ?? ''}, true)`,
  );
}
