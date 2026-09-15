import { Inject, Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { type TAlsStorage } from '../../storage/async-local-storage/als.module.js';
import { ALS } from '../../storage/async-local-storage/als.token.js';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  constructor(@Inject(ALS) private readonly als: TAlsStorage) {}

  use(req: Request, _res: Response, next: NextFunction) {
    this.als.run({ logger: req.log }, () => next());
  }
}
