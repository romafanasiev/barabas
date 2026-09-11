import { z } from 'zod';
import { envSchema } from './env.schema.js';

export type Env = z.infer<typeof envSchema>;
