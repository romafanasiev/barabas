import { Global, Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import path from 'path';
import { validateEnv } from './env.validation.js';

export const ENV = Symbol('ENV');

@Global()
@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      envFilePath: path.resolve(import.meta.dirname, '../../../../.env'),
    }),
  ],
  providers: [
    {
      provide: ENV,
      useFactory: () => validateEnv(process.env),
    },
  ],
  exports: [ENV],
})
export class AppConfigModule {}
