import { Component } from '@nestjs/common';
import youtubeDl from 'youtube-dl';

@Component()
export class YoutubeDl {
  public getInfo(video: any): Promise<any> {
    return new Promise((resolve, reject) => {
      youtubeDl.getInfo(
        video,
        ['-format=bestvideo[ext!=webm]+bestaudio[ext!=webm]/best[ext!=webm]'],
        (err: Error, result: any) => {
          if (err) {
            reject(err);
          } else {
            console.log('youtube info', result);
            resolve(result);
          }
        },
      );
    });
  }
}
