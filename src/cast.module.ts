import { Module } from '@nestjs/common';
import { CastSocket } from './cast.gateway';
import { CastExceptionFilter } from './common/exception.filter';
import { OmxVideoPlayer } from './common/omxPlayer.service';
import { Screen } from './common/screen.service';
import { VideoStream } from './stream/videoStream.service';
import { YoutubeDl } from './stream/youtubeDl.service';

@Module({
  providers: [
    CastExceptionFilter,
    CastSocket,
    {
      provide: 'Player',
      useClass: OmxVideoPlayer,
    },
    Screen,
    VideoStream,
    YoutubeDl,
  ],
})
export class CastModule {}
