import { drizzle } from 'drizzle-orm/node-postgres';
import type { Client } from 'pg';
import { setAuditContext } from '../../src/core/infrastructure/postgres/audit/audit-context.js';
import { AUDIT_LOG_ACTION_DATA_CHECK } from '../../src/core/infrastructure/postgres/audit/audit-log.constraints.js';
import {
  ids,
  seedCatalog,
  seedNeighbours,
  seedSale,
} from '../../utils/tests/db/catalog.fixture.js';
import {
  expectError,
  expectViolation,
  SqlState,
  withRollback,
} from '../../utils/tests/db/db.helpers.js';

const requestId = 'c0000000-0000-4000-8000-000000000001';

type AuditRow = {
  table_name: string;
  row_id: string;
  action: string;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  changed_by: string | null;
  request_id: string | null;
  db_role: string;
};

/* Rows the test itself produced: the fixtures write their own INSERT rows first. */
async function auditOf(
  client: Client,
  rowId: string,
  action?: string,
): Promise<AuditRow[]> {
  const { rows } = await client.query<AuditRow>(
    `SELECT table_name, row_id, action, old_data, new_data, changed_by, request_id, db_role
     FROM audit_log
     WHERE row_id = $1 AND ($2::audit_action IS NULL OR action = $2)
     ORDER BY id`,
    [rowId, action ?? null],
  );
  return rows;
}

describe('audit of order', () => {
  it('UPDATE writes the old and the new row, the user and the request', () =>
    withRollback(async (client) => {
      await seedCatalog(client);
      await setAuditContext(drizzle({ client }), {
        userId: ids.user,
        requestId,
      });

      await client.query(
        `UPDATE "order" SET status = 'refunded' WHERE id = '${ids.order}'`,
      );

      const rows = await auditOf(client, ids.order, 'UPDATE');
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({
        table_name: 'order',
        old_data: { id: ids.order, status: 'paid' },
        new_data: { id: ids.order, status: 'refunded' },
        changed_by: ids.user,
        request_id: requestId,
      });
    }));

  it('a write without context, as from psql, gets NULL and the database role', () =>
    withRollback(async (client) => {
      await seedCatalog(client);
      const { rows: role } = await client.query<{ name: string }>(
        `SELECT current_user AS name`,
      );

      await client.query(
        `UPDATE "order" SET status = 'refunded' WHERE id = '${ids.order}'`,
      );

      expect(await auditOf(client, ids.order, 'UPDATE')).toMatchObject([
        { changed_by: null, request_id: null, db_role: role[0]?.name },
      ]);
    }));

  it('INSERT is recorded with no old row', () =>
    withRollback(async (client) => {
      await seedCatalog(client);

      expect(await auditOf(client, ids.order)).toMatchObject([
        { action: 'INSERT', old_data: null, new_data: { status: 'paid' } },
      ]);
    }));

  it('an UPDATE that changes nothing leaves no row', () =>
    withRollback(async (client) => {
      await seedCatalog(client);

      await client.query(
        `UPDATE "order" SET status = status WHERE id = '${ids.order}'`,
      );

      expect(await auditOf(client, ids.order, 'UPDATE')).toEqual([]);
    }));

  it('a failing audit write rolls back the change it describes', () =>
    withRollback(async (client) => {
      await seedCatalog(client);
      await client.query(`SELECT set_config('app.request_id', 'r-1', true)`);

      await expectError(
        client,
        `UPDATE "order" SET status = 'refunded' WHERE id = '${ids.order}'`,
        {
          code: SqlState.invalidTextRepresentation,
          message: /invalid input syntax for type uuid/,
        },
      );

      const { rows } = await client.query<{ status: string }>(
        `SELECT status FROM "order" WHERE id = '${ids.order}'`,
      );
      expect(rows[0]?.status).toBe('paid');
    }));
});

describe('audit of ticket_allocation', () => {
  it('UPDATE of the counters keeps both values', () =>
    withRollback(async (client) => {
      await seedSale(client);

      await client.query(
        `UPDATE ticket_allocation SET held = held - 2, sold = sold + 2
         WHERE id = '${ids.allocation}'`,
      );

      expect(await auditOf(client, ids.allocation, 'UPDATE')).toMatchObject([
        {
          table_name: 'ticket_allocation',
          old_data: { held: 2, sold: 0 },
          new_data: { held: 0, sold: 2 },
        },
      ]);
    }));

  it('DELETE is recorded with no new row', () =>
    withRollback(async (client) => {
      await seedCatalog(client);
      await seedNeighbours(client);

      await client.query(
        `DELETE FROM ticket_allocation WHERE id = '${ids.otherAllocation}'`,
      );

      expect(
        await auditOf(client, ids.otherAllocation, 'DELETE'),
      ).toMatchObject([
        { old_data: { id: ids.otherAllocation, capacity: 30 }, new_data: null },
      ]);
    }));
});

describe('audit_log CHECK', () => {
  it.each([
    ['INSERT', `'{}'`, `'{}'`],
    ['UPDATE', 'NULL', `'{}'`],
    ['UPDATE', `'{}'`, 'NULL'],
    ['DELETE', `'{}'`, `'{}'`],
  ])(
    '%s with old_data %s and new_data %s is rejected',
    (action, oldData, newData) =>
      withRollback(async (client) => {
        await expectViolation(
          client,
          `INSERT INTO audit_log (table_name, row_id, action, old_data, new_data)
           VALUES ('order', '${ids.order}', '${action}', ${oldData}, ${newData})`,
          SqlState.checkViolation,
          AUDIT_LOG_ACTION_DATA_CHECK,
        );
      }),
  );
});
