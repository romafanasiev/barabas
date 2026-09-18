import type { NodePgDatabase } from 'drizzle-orm/node-postgres';

export type Database = NodePgDatabase;

export type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0];

export type DbOrTx = Database | Transaction;
