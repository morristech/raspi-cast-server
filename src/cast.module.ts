import { Module } from '@nestjs/common';
import { CastSocket } from './cast.gateway';
import { CastExceptionFilter } from './common/exception.filter';
import { Player } from './common/player.service';
import { Screen } from './common/screen.service';
import { VideoStream } from './stream/videoStream.service';
import { YoutubeDl } from './stream/youtubeDl.service';

@Module({
  providers: [
    CastExceptionFilter,
    CastSocket,
    Player,
    Screen,
    VideoStream,
    YoutubeDl,
  ],
})
export class CastModule {}
