import { faker } from '@faker-js/faker';
import {
  makeRequiredRawEnv,
  withoutEnv,
} from '../../utils/tests/fixtures/env.fixture.js';
import { validateEnv } from './env.validation.js';

describe('validateEnv', () => {
  it('корректно валедирует данные', () => {
    const raw = makeRequiredRawEnv({ POSTGRES_URL: faker.internet.url() });

    const act = () => validateEnv(raw);

    expect(act).not.toThrow();
  });

  it('отбивает oтсутствие переменной', () => {
    const envs = makeRequiredRawEnv();
    const raw = withoutEnv(envs, 'POSTGRES_URL');

    const act = () => validateEnv(raw);

    expect(act).toThrow(/POSTGRES_URL/);
  });

  it('отбивает пустую строку', () => {
    const raw = makeRequiredRawEnv({ POSTGRES_URL: '' });

    const act = () => validateEnv(raw);

    expect(act).toThrow(/POSTGRES_URL/);
  });

  it('приводит числовые переменные из строк', () => {
    const raw = makeRequiredRawEnv({ PORT: '8080' });

    const env = validateEnv(raw);

    expect(env.PORT).toBe(8080);
  });

  it('отбивает дедлайн остановки, который короче паузы на дренаж', () => {
    const raw = makeRequiredRawEnv({
      SHUTDOWN_DRAIN_DELAY_MS: '5000',
      SHUTDOWN_TIMEOUT_MS: '5000',
    });

    const act = () => validateEnv(raw);

    expect(act).toThrow(/SHUTDOWN_TIMEOUT_MS/);
  });

  it('подставляет дефолты, когда заданы только обязательные переменные', () => {
    const raw = makeRequiredRawEnv();

    const env = validateEnv(raw);

    expect(env).toMatchObject({
      NODE_ENV: 'development',
      PORT: 3000,
    });
  });
});
