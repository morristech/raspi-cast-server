import { spawn } from 'child_process';
import * as dotenv from 'dotenv';
import path from 'path';
import 'reflect-metadata';

dotenv.load({
  path: path.join(process.cwd(), `env/${process.env.NODE_ENV}.env`),
});

import { NestFactory } from '@nestjs/core';

import { CastModule } from './cast.module';
import { Screen } from './common/screen.service';

(async () => {
  const app = await NestFactory.create(CastModule, {});
  const screen = app.get<Screen>(Screen);

  await app.listen(Number(process.env.SOCKET_PORT));
  if (process.env.NODE_ENV === 'production') {
    spawn('setterm', ['-powersave', 'off', '-blank', '0']);
    screen.printIp();
  }
})();
