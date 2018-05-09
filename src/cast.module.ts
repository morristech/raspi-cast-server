import { Module } from '@nestjs/common';
import { CastSocket } from './cast.gateway';
import { Player } from './components/Player';
import { Screen } from './components/Screen';
import { YoutubeDl } from './components/YoutubeDl';

@Module({
  components: [CastSocket, Screen, Player, YoutubeDl],
})
export class CastModule {}
