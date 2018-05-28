import { Inject, Injectable } from '@nestjs/common';
import { CastOptions, CastType } from 'raspi-cast-common';

import { YoutubeDl } from './youtubeDl.service';

@Injectable()
export class VideoStream {
  constructor(@Inject(YoutubeDl) private youtubeDl: YoutubeDl) {}

  public getMetaInfo(options: CastOptions) {
    switch (options.type) {
      case CastType.YOUTUBEDL:
      default:
        return this.youtubeDl.getInfo(options.data);
    }
  }
}
