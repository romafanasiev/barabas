import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Writable } from 'node:stream';
import pino from 'pino';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { validateEnv } from '../src/config/env.validation.js';
import { createLoggerOptions } from '../src/core/telemetry/logger/logger.options.js';
import { LOGGER } from '../src/core/telemetry/logger/logger.token.js';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const REQUEST_MSG = 'request completed';
const SERVICE_MSG = 'greeting requested';

type LogLine = Record<string, unknown>;

type RequestFields = {
  path?: string;
  queryKeys?: string[];
  headers: Record<string, string>;
};

describe('logging (e2e)', () => {
  let app: INestApplication<App>;
  let lines: LogLine[];
  let logger: pino.Logger;

  /** Строка лога по её msg. Читаем то, что реально ушло в поток. */
  const lineWith = (msg: string): LogLine | undefined =>
    lines.find((line) => line.msg === msg);

  /** Всё, что реально ушло в поток, одной строкой. Ищем секрет здесь. */
  const everything = (): string =>
    lines.map((line) => JSON.stringify(line)).join('\n');

  /** Поле req из строки запроса — то, что осталось после сериализатора. */
  const requestFields = (): RequestFields | undefined =>
    lineWith(REQUEST_MSG)?.req as RequestFields | undefined;

  beforeEach(async () => {
    lines = [];

    // redact срабатывает при сериализации, поэтому собираем готовые строки,
    // а не аргументы вызовов логгера.
    const sink = new Writable({
      write(chunk, _encoding, callback) {
        for (const line of chunk.toString().split('\n')) {
          if (line.trim()) {
            lines.push(JSON.parse(line));
          }
        }
        callback();
      },
    });

    const env = validateEnv({ ...process.env, NODE_ENV: 'test' });
    logger = pino(createLoggerOptions(env), sink);

    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(LOGGER)
      .useValue(logger)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useLogger(false);
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('один запрос → строка запроса и строка из сервиса с одинаковым requestId', async () => {
    const server = app.getHttpServer();

    await request(server).get('/').expect(200);

    const fromRequest = lineWith(REQUEST_MSG);
    const fromService = lineWith(SERVICE_MSG);

    expect(fromRequest?.requestId).toEqual(expect.any(String));
    expect(fromService?.requestId).toBe(fromRequest?.requestId);
  });

  it('присланный x-request-id используется и возвращается в ответе', async () => {
    const sent = crypto.randomUUID();

    const response = await request(app.getHttpServer())
      .get('/')
      .set('x-request-id', sent)
      .expect(200);

    expect(response.headers['x-request-id']).toBe(sent);
    expect(lineWith(REQUEST_MSG)?.requestId).toBe(sent);
    expect(lineWith(SERVICE_MSG)?.requestId).toBe(sent);
  });

  it('мусорный x-request-id отбрасывается, генерируется свой', async () => {
    const garbage = 'not-a-uuid","level":30,"msg":"fake';

    const response = await request(app.getHttpServer())
      .get('/')
      .set('x-request-id', garbage)
      .expect(200);

    const used = response.headers['x-request-id'];

    expect(used).not.toBe(garbage);
    expect(used).toMatch(UUID_RE);
    expect(lineWith(REQUEST_MSG)?.requestId).toBe(used);
  });

  it('authorization не попадает в лог', async () => {
    await request(app.getHttpServer())
      .get('/')
      .set('authorization', 'Bearer secret-token-value')
      .expect(200);

    expect(everything()).not.toContain('secret-token-value');
    expect(requestFields()?.headers.authorization).toBeUndefined();
  });

  it('незнакомый заголовок не попадает в лог, разрешённый — попадает', async () => {
    await request(app.getHttpServer())
      .get('/')
      .set('x-api-key', 'SECRET_CUSTOM_HEADER')
      .set('user-agent', 'probe/1.0')
      .expect(200);

    const headers = requestFields()?.headers;

    expect(everything()).not.toContain('SECRET_CUSTOM_HEADER');
    expect(headers?.['x-api-key']).toBeUndefined();
    expect(headers?.['user-agent']).toBe('probe/1.0');
  });

  it('значение query-параметра не попадает в лог, а путь читается', async () => {
    await request(app.getHttpServer())
      .get('/?token=SECRET_IN_QUERY&page=2')
      .expect(200);

    const req = requestFields();

    expect(everything()).not.toContain('SECRET_IN_QUERY');
    expect(req?.path).toBe('/');
    expect(req?.queryKeys).toEqual(['token', 'page']);
  });

  it('email из query не попадает в лог', async () => {
    await request(app.getHttpServer())
      .get('/?email=victim@example.com')
      .expect(200);

    expect(everything()).not.toContain('victim@example.com');
    expect(requestFields()?.queryKeys).toEqual(['email']);
  });

  it('секрет вырезается на вложенности и внутри массива', () => {
    logger.info(
      {
        user: { profile: { password: 'DEEP_SECRET' } },
        users: [{ token: 'ARRAY_SECRET' }],
      },
      'nested',
    );

    const line = lineWith('nested') as {
      user: { profile: { password: string } };
      users: { token: string }[];
    };

    expect(everything()).not.toContain('DEEP_SECRET');
    expect(everything()).not.toContain('ARRAY_SECRET');
    expect(line.user.profile.password).toBe('[Redacted]');
    expect(line.users[0]?.token).toBe('[Redacted]');
  });

  it('платёжные данные вырезаются, email маскируется', () => {
    logger.info(
      {
        order: {
          email: 'victim@example.com',
          card: { number: '4111111111111111', cvv: '123' },
        },
      },
      'payment',
    );

    const line = lineWith('payment') as {
      order: { email: string; card: string };
    };

    expect(everything()).not.toContain('4111111111111111');
    expect(everything()).not.toContain('victim@example.com');
    expect(line.order.card).toBe('[Redacted]');
    expect(line.order.email).toBe('v***@example.com');
  });
});
