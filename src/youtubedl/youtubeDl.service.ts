import { Injectable } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { CastMeta, Errors } from 'raspi-cast-common';
import youtubeDl from 'youtube-dl';

@Injectable()
export class YoutubeDl {
  public getInfo(video: any): Promise<CastMeta> {
    return new Promise((resolve, reject) => {
      youtubeDl.getInfo(
        video,
        ['-format=bestvideo[ext!=webm]+bestaudio[ext!=webm]/best[ext!=webm]'],
        (err: Error, result: any) => {
          if (err) {
            reject(new WsException(Errors.UNSUPORTED_STREAM));
          } else {
            resolve(result);
          }
        },
      );
    });
  }
}
