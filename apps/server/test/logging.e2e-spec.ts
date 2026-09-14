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

describe('logging (e2e)', () => {
  let app: INestApplication<App>;
  let lines: LogLine[];

  /** Строка лога по её msg. Читаем то, что реально ушло в поток. */
  const lineWith = (msg: string): LogLine | undefined =>
    lines.find((line) => line.msg === msg);

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
    const logger = pino(createLoggerOptions(env), sink);

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
    const secret = 'Bearer secret-token-value';

    await request(app.getHttpServer())
      .get('/')
      .set('authorization', secret)
      .expect(200);

    const serialised = lines.map((line) => JSON.stringify(line)).join('\n');
    const req = lineWith(REQUEST_MSG)?.req as
      { headers: Record<string, string> } | undefined;

    expect(serialised).not.toContain('secret-token-value');
    expect(req?.headers.authorization).toBe('[Redacted]');
  });
});
