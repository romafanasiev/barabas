import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { ENV } from './config/config.module.js';
import { Env } from './config/env.type.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const env = app.get<Env>(ENV);

  await app.listen(env.PORT);
}
await bootstrap();
