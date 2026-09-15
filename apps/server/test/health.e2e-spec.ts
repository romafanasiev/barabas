import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Redis } from 'ioredis';
import pino from 'pino';
import { Pool } from 'pg';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import {
  POSTGRES,
  REDIS,
} from '../src/core/infrastructure/infrastructure.tokens.js';
import { LOGGER } from '../src/core/telemetry/logger/logger.token.js';
import { HEALTH_CHECK_TIMEOUT_MS } from '../src/health/health.constants.js';

const makeClient = (query: ReturnType<typeof vi.fn>) => ({
  query,
  release: vi.fn(),
});

const makePool = (client: ReturnType<typeof makeClient>) => ({
  connect: vi.fn().mockResolvedValue(client),
});

const makeRedis = (ping: ReturnType<typeof vi.fn>) => ({ ping });

type Deps = {
  pool: ReturnType<typeof makePool>;
  redis: ReturnType<typeof makeRedis>;
};

describe('health (e2e)', () => {
  let app: INestApplication<App>;

  const createApp = async ({ pool, redis }: Deps) => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(POSTGRES)
      .useValue(pool as unknown as Pool)
      .overrideProvider(REDIS)
      .useValue(redis as unknown as Redis)
      .overrideProvider(LOGGER)
      .useValue(pino({ level: 'silent' }))
      .compile();

    app = moduleFixture.createNestApplication();
    app.useLogger(false);
    await app.init();

    return app.getHttpServer();
  };

  const healthy = (): Deps => ({
    pool: makePool(makeClient(vi.fn().mockResolvedValue({ rows: [{}] }))),
    redis: makeRedis(vi.fn().mockResolvedValue('PONG')),
  });

  afterEach(async () => {
    await app.close();
  });

  it('GET /health отвечает 200 и не трогает ни одну зависимость', async () => {
    const deps = healthy();
    const server = await createApp(deps);

    await request(server).get('/health').expect(200, { status: 'ok' });

    expect(deps.pool.connect).not.toHaveBeenCalled();
    expect(deps.redis.ping).not.toHaveBeenCalled();
  });

  it('GET /health/ready отвечает 200, когда живы обе зависимости', async () => {
    const deps = healthy();
    const server = await createApp(deps);

    const response = await request(server).get('/health/ready').expect(200);

    expect(response.body.status).toBe('ok');
    expect(response.body.info.postgres.status).toBe('up');
    expect(response.body.info.redis.status).toBe('up');
    expect(deps.pool.connect).toHaveBeenCalledTimes(1);
    expect(deps.redis.ping).toHaveBeenCalledTimes(1);
  });

  it('GET /health/ready отвечает 503 и называет упавшую зависимость', async () => {
    const deps = healthy();
    deps.pool.connect.mockRejectedValue(new Error('connect ECONNREFUSED'));

    const server = await createApp(deps);

    const response = await request(server).get('/health/ready').expect(503);

    expect(response.body.error.postgres.status).toBe('down');
    expect(response.body.error.redis).toBeUndefined();
    expect(response.body.info.redis.status).toBe('up');
  });

  it('GET /health/ready отвечает 503 по таймауту и освобождает соединение', async () => {
    const deps = healthy();
    const client = makeClient(vi.fn().mockReturnValue(new Promise(() => {})));
    deps.pool.connect.mockResolvedValue(client);

    const server = await createApp(deps);

    const startedAt = Date.now();
    const response = await request(server).get('/health/ready').expect(503);
    const elapsed = Date.now() - startedAt;

    expect(response.body.error.postgres.message).toContain('timeout');
    expect(elapsed).toBeLessThan(HEALTH_CHECK_TIMEOUT_MS * 2);
    expect(client.release).toHaveBeenCalledWith(true);
  });
});
