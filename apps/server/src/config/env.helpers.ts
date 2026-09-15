import type { Env } from './env.type.js';

export const isTestEnv = (env: Env): boolean => env.NODE_ENV === 'test';

export const isDevEnv = (env: Env): boolean => env.NODE_ENV === 'development';
