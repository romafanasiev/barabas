import { z } from 'zod';

export const envSchema = z
  .object({
    NODE_ENV: z
      .enum(['development', 'test', 'production'])
      .default('development'),

    PORT: z.coerce.number().int().positive().default(3000),

    POSTGRES_URL: z.url(),

    REDIS_URL: z.url(),

    LOG_LEVEL: z
      .enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal', 'silent'])
      .default('info'),

    SHUTDOWN_DRAIN_DELAY_MS: z.coerce
      .number()
      .int()
      .nonnegative()
      .default(5000),

    SHUTDOWN_TIMEOUT_MS: z.coerce.number().int().positive().default(15000),
  })
  .refine((env) => env.SHUTDOWN_TIMEOUT_MS > env.SHUTDOWN_DRAIN_DELAY_MS, {
    message:
      'SHUTDOWN_TIMEOUT_MS должен быть строго больше SHUTDOWN_DRAIN_DELAY_MS',
    path: ['SHUTDOWN_TIMEOUT_MS'],
  });
