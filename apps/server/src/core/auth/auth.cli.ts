import { drizzle } from 'drizzle-orm/node-postgres';
import { z } from 'zod';
import { createAuth } from './auth.options.js';

const url = z
  .url({ error: 'POSTGRES_URL is missing or is not a url' })
  .parse(process.env.POSTGRES_URL);

export const auth = createAuth(drizzle(url));
