import { Module } from '@nestjs/common';
import { CastSocket } from './cast.gateway';
import { CastExceptionFilter } from './common/exception.filter';
import { Player } from './common/player.service';
import { Screen } from './common/screen.service';
import { YoutubeDl } from './youtubedl/youtubeDl.service';

@Module({
  providers: [CastExceptionFilter, CastSocket, Player, Screen, YoutubeDl],
})
export class CastModule {}
