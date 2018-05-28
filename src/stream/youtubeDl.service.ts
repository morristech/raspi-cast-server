import { Injectable } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { Errors } from 'raspi-cast-common';
import { bindNodeCallback, Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import youtubeDl from 'youtube-dl';

@Injectable()
export class YoutubeDl {
  public getInfo(video: any): Observable<any> {
    return bindNodeCallback(youtubeDl.getInfo.bind(youtubeDl))(video, [
      '-format=bestvideo[ext!=webm]+bestaudio[ext!=webm]/best[ext!=webm]',
    ]).pipe(
      catchError(() => throwError(new WsException(Errors.UNSUPORTED_STREAM))),
    );
  }
}
