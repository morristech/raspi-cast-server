import { Inject, Injectable } from '@nestjs/common';
import { CastMeta, Errors } from 'raspi-cast-common';
import youtubeDl from 'youtube-dl';

import { Player } from '../common/player.service';

@Injectable()
export class YoutubeDl {
  constructor(@Inject(Player) private player: Player) {}
  public getInfo(video: any): Promise<CastMeta> {
    return new Promise((resolve, reject) => {
      youtubeDl.getInfo(
        video,
        ['-format=bestvideo[ext!=webm]+bestaudio[ext!=webm]/best[ext!=webm]'],
        (err: Error, result: any) => {
          if (err) {
            reject(Errors.UNSUPORTED_STREAM);
          } else {
            this.player.state.meta = {
              title: result.title,
              description: result.description,
              thumbnail: result.thumbnail,
              url: result.url,
            };
            resolve(result);
          }
        },
      );
    });
  }
}
