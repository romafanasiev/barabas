import { Inject, Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { HttpLogger, pinoHttp } from 'pino-http';
import { v4, validate } from 'uuid';
import { LOGGER } from './logger.token.js';
import { type AppLogger } from './logger.type.js';

@Injectable()
export class PinoHttpMiddleware implements NestMiddleware {
  private readonly httpLogger: HttpLogger<Request, Response>;

  constructor(@Inject(LOGGER) private readonly logger: AppLogger) {
    this.httpLogger = pinoHttp({
      quietReqLogger: true,
      customAttributeKeys: {
        reqId: 'requestId',
        responseTime: 'responseTimeMs',
      },
      genReqId: (req: Request, res) => {
        const headerKey = 'x-request-id';
        const id = req.headers[headerKey];
        const isValid = validate(id);
        const generatedId = v4();

        if (!isValid || typeof id !== 'string') {
          res.setHeader(headerKey, generatedId);
          return generatedId;
        }

        res.setHeader(headerKey, id);
        return id;
      },
      logger: this.logger,
    });
  }

  use(req: Request, res: Response, next: NextFunction) {
    this.httpLogger(req, res, next);
  }
}
