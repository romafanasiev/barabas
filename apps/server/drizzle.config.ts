import { defineConfig } from 'drizzle-kit';
import { z } from 'zod';

/* This file runs in the drizzle-kit CLI, not in Nest: the env validation from
   `src/config` never boots here. Parse the one variable this config needs, so a
   missing POSTGRES_URL fails while reading the config instead of somewhere inside
   the postgres driver. */
const url = z
  .url({ error: 'POSTGRES_URL is missing or is not a url' })
  .parse(process.env.POSTGRES_URL);

export default defineConfig({
  schema: ['./src/modules/**/infrastructure/*.schema.ts'],
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: { url },
});
