import { Component } from '@nestjs/common';
import youtubeDl from 'youtube-dl';

import { CastMeta } from '../types/CastMeta';

@Component()
export class YoutubeDl {
  public getInfo(video: any): Promise<CastMeta> {
    return new Promise((resolve, reject) => {
      youtubeDl.getInfo(
        video,
        ['-format=bestvideo[ext!=webm]+bestaudio[ext!=webm]/best[ext!=webm]'],
        (err: Error, result: any) => {
          if (err) {
            reject(err);
          } else {
            resolve(result);
          }
        },
      );
    });
  }
}
