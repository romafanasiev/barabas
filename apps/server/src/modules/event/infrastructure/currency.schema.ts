import { char, pgTable, varchar } from 'drizzle-orm/pg-core';

export const currency = pgTable('currency', {
  code: char('code', { length: 3 }).primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
});
