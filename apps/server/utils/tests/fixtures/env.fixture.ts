import { faker } from '@faker-js/faker';

export type RawEnv = Record<string, string>;

export function makeRequiredRawEnv(overrides: Partial<RawEnv> = {}): RawEnv {
  return {
    POSTGRES_URL: `postgres://${faker.internet.username()}:${faker.internet.password()}@localhost:5432/${faker.word.noun()}`,
    ...overrides,
  };
}

export function withoutEnv(raw: RawEnv, ...keys: string[]): RawEnv {
  const rest = { ...raw };

  for (const key of keys) {
    delete rest[key];
  }

  return rest;
}
