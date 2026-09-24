import { sql } from 'drizzle-orm';
import { char, check, pgTable, varchar } from 'drizzle-orm/pg-core';
import {
  CURRENCY_CODE_CHECK,
  CURRENCY_NAME_CHECK,
} from './currency.constraints.js';

export const currency = pgTable(
  'currency',
  {
    code: char('code', { length: 3 }).primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
  },
  (table) => [
    check(CURRENCY_CODE_CHECK, sql`${table.code} ~ '^[A-Z]{3}$'`),
    check(CURRENCY_NAME_CHECK, sql`length(btrim(${table.name})) > 0`),
  ],
);
