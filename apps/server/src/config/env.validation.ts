import { z } from 'zod';
import { envSchema } from './env.schema.js';
import { type Env } from './env.type.js';

export function parseEnv<Schema extends z.ZodType>(
  schema: Schema,
  raw: Record<string, unknown>,
): z.infer<Schema> {
  const result = schema.safeParse(raw);

  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `  ${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('\n');

    throw new Error(`Некорректные переменные окружения:\n${details}`);
  }

  return result.data;
}

export function validateEnv(raw: Record<string, unknown>): Env {
  return parseEnv(envSchema, raw);
}
