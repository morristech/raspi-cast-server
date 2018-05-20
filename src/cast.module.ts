import { Module } from '@nestjs/common';
import { CastSocket } from './cast.gateway';
import { Player } from './common/player.service';
import { Screen } from './common/screen.service';
import { YoutubeDl } from './youtubedl/youtubeDl.service';

@Module({
  providers: [CastSocket, Screen, Player, YoutubeDl],
})
export class CastModule {}
