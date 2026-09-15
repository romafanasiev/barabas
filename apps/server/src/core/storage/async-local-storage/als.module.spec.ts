import { Test, TestingModule } from '@nestjs/testing';
import { setTimeout as delay } from 'node:timers/promises';
import pino from 'pino';
import { AlsModule, TAlsStorage } from './als.module.js';
import { ALS } from './als.token.js';

describe('async local storage', () => {
  let moduleRef: TestingModule;
  let als: TAlsStorage;

  beforeEach(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [AlsModule],
    }).compile();
    als = moduleRef.get<TAlsStorage>(ALS);
  });

  afterEach(async () => {
    await moduleRef.close();
  });

  it('два run() параллельно — каждый видит своё значение.', async () => {
    const firstLogger = pino();
    const secondLogger = pino();
    const store1 = { logger: firstLogger };
    const store2 = { logger: secondLogger };
    const promise = als.run(store1, async () => {
      await delay(50);
      return als.getStore();
    });
    const promise2 = als.run(store2, async () => {
      await delay(20);
      return als.getStore();
    });

    const [res1, res2] = await Promise.all([promise, promise2]);

    expect(res1).toBe(store1);
    expect(res2).toBe(store2);
  });

  it('getStore() вне всякого run() → undefined.', () => {
    expect(als.getStore()).toBeUndefined();
  });

  it('вложенный run() внутри внешнего перекрывает значение, а после выхода внешний контекст цел.', () => {
    const firstLogger = pino();
    const secondLogger = pino();
    const store1 = { logger: firstLogger };
    const store2 = { logger: secondLogger };

    als.run(store1, () => {
      als.run(store2, () => {
        expect(als.getStore()).toBe(store2);
      });
      expect(als.getStore()).toBe(store1);
    });
  });
});
