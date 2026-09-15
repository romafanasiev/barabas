import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Redis } from 'ioredis';
import pino from 'pino';
import { Pool } from 'pg';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { AppModule } from './../src/app.module.js';
import {
  POSTGRES,
  REDIS,
} from '../src/core/infrastructure/infrastructure.tokens.js';
import { LOGGER } from '../src/core/telemetry/logger/logger.token.js';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(POSTGRES)
      .useValue({ end: vi.fn() } as unknown as Pool)
      .overrideProvider(REDIS)
      .useValue({ quit: vi.fn() } as unknown as Redis)
      .overrideProvider(LOGGER)
      .useValue(pino({ level: 'silent' }))
      .compile();

    app = moduleFixture.createNestApplication();
    app.useLogger(false);
    await app.init();
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Hello World!');
  });

  afterEach(async () => {
    await app.close();
  });
});
