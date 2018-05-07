import * as dotenv from 'dotenv';
import 'reflect-metadata';

dotenv.load();

import { NestFactory } from '@nestjs/core';

import { CastModule } from './cast.module';

(async () => {
  console.log('adadada');
  const app = await NestFactory.create(CastModule, {});

  await app.listen(process.env.PORT as any);
})();
