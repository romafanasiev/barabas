import { z } from 'zod';

/** Levels that log request internals: useful while debugging, never in production. */
const VERBOSE_LOG_LEVELS: ReadonlySet<string> = new Set(['trace', 'debug']);

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
  })
  .refine(
    (env) =>
      env.NODE_ENV !== 'production' || !VERBOSE_LOG_LEVELS.has(env.LOG_LEVEL),
    {
      message:
        'LOG_LEVEL=trace|debug запрещён при NODE_ENV=production: такие логи пишут ' +
        'внутренности запросов, стоят денег и переживают ротацию',
      path: ['LOG_LEVEL'],
    },
  );
