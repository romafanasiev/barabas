import { Controller, Get, INestApplication, Inject } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Redis } from 'ioredis';
import http from 'node:http';
import { AddressInfo } from 'node:net';
import { Pool } from 'pg';
import pino from 'pino';
import { AppModule } from '../src/app.module.js';
import {
  POSTGRES,
  REDIS,
} from '../src/core/infrastructure/infrastructure.tokens.js';
import { ShutdownState } from '../src/core/lifecycle/shutdown.state.js';
import { LOGGER } from '../src/core/telemetry/logger/logger.token.js';

const SLOW_HANDLER_MS = 200;

type Deferred = { promise: Promise<void>; resolve: () => void };

const defer = (): Deferred => {
  let resolve!: () => void;
  const promise = new Promise<void>((r) => (resolve = r));

  return { promise, resolve };
};

let handlerStarted: Deferred;

@Controller()
class SlowController {
  constructor(@Inject(POSTGRES) private readonly pool: Pool) {}

  @Get('/slow')
  async slow(): Promise<string> {
    handlerStarted.resolve();

    await new Promise((resolve) => setTimeout(resolve, SLOW_HANDLER_MS));
    await this.pool.query('SELECT 1');

    return 'slow response';
  }
}

const makePool = (closedInOrder: string[]) => {
  let ended = false;

  const refuseWhenEnded = () => {
    if (ended) {
      throw new Error('Cannot use a pool after calling end on the pool');
    }
  };

  return {
    connect: vi.fn(async () => {
      refuseWhenEnded();

      return {
        query: vi.fn().mockResolvedValue({ rows: [{}] }),
        release: vi.fn(),
      };
    }),
    query: vi.fn(async () => {
      refuseWhenEnded();

      return { rows: [{}] };
    }),
    end: vi.fn(async () => {
      ended = true;
      closedInOrder.push('postgres');
    }),
  };
};

const makeRedis = (closedInOrder: string[]) => ({
  ping: vi.fn().mockResolvedValue('PONG'),
  quit: vi.fn(async () => {
    closedInOrder.push('redis');

    return 'OK';
  }),
});

const get = (port: number, path: string) =>
  new Promise<{ status: number; body: string }>((resolve, reject) => {
    const req = http.request(
      { host: '127.0.0.1', port, path, agent: false },
      (res) => {
        let body = '';

        res.setEncoding('utf8');
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => resolve({ status: res.statusCode ?? 0, body }));
      },
    );

    req.on('error', reject);
    req.end();
  });

describe('shutdown (e2e)', () => {
  let app: INestApplication;
  let pool: ReturnType<typeof makePool>;
  let redis: ReturnType<typeof makeRedis>;
  let port: number;
  let closed: boolean;
  let closedInOrder: string[];

  beforeEach(async () => {
    handlerStarted = defer();
    closedInOrder = [];
    pool = makePool(closedInOrder);
    redis = makeRedis(closedInOrder);
    closed = false;

    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
      controllers: [SlowController],
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
    await app.listen(0);

    const address = (app.getHttpServer() as http.Server).address();

    port = (address as AddressInfo).port;
  });

  afterEach(async () => {
    if (!closed) {
      await app.close();
    }
  });

  const close = async () => {
    closed = true;
    await app.close();
  };

  it('запрос в полёте доживает до полного ответа, пока приложение закрывается', async () => {
    const pending = get(port, '/slow');

    await handlerStarted.promise;
    await close();

    const response = await pending;

    expect(response.status).toBe(200);
    expect(response.body).toBe('slow response');
  });

  it('зависимости закрываются после сервера и в заданном порядке', async () => {
    await close();

    expect(closedInOrder).toEqual(['postgres', 'redis']);
  });

  it('во время остановки liveness остаётся 200, а readiness отдаёт 503', async () => {
    app.get(ShutdownState).begin();

    const live = await get(port, '/health');
    const ready = await get(port, '/health/ready');

    expect(live.status).toBe(200);
    expect(ready.status).toBe(503);
    expect(JSON.parse(ready.body).error.shutdown.status).toBe('down');
  });
});
