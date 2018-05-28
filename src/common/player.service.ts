import { Injectable } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import OmxPlayer from 'node-omxplayer-raspberry-pi-cast';
import path from 'path';
import { mergeAll } from 'ramda';
import { CastMeta, Errors, Playback, PlaybackStatus } from 'raspi-cast-common';
import {
  BehaviorSubject,
  forkJoin,
  from,
  fromEvent,
  Observable,
  of,
} from 'rxjs';
import { map, tap } from 'rxjs/operators';

import { promisifyAndBind } from '../helpers/utils';

const spinner = path.join(process.cwd(), 'assets/loading-screen.mp4');

export interface PlayerState {
  isPending: boolean;
  meta?: CastMeta;
  volume?: number;
}

@Injectable()
export class Player {
  public close$: Observable<void>;
  public status$ = new BehaviorSubject<Playback>(PlaybackStatus.STOPPED);

  private omx: OmxPlayer;
  private state: PlayerState = {
    isPending: false,
  };

  public init(
    source = spinner,
    loop = false,
    output = 'both',
    noOsd = false,
  ): Observable<any> {
    return new Observable(observer => {
      if (this.status$.getValue() !== PlaybackStatus.STOPPED) {
        this.status$.next(PlaybackStatus.STOPPED);
      }
      const onSuccess = (err: Error, data: any) => {
        setTimeout(() => {
          console.log('new Omx', err, data);
          if (err) {
            observer.error(err);
          } else {
            if (source !== spinner) {
              this.status$.next(PlaybackStatus.PLAYING);
              this.close$ = fromEvent<void>(this.omx as any, 'close').pipe(
                tap(() => console.log('close rxjs !!!!!')),
                tap(() => this.status$.next(PlaybackStatus.STOPPED)),
                tap(() => this.resetState()),
              );
            }
            observer.next(data);
          }
        }, 5000);
      };
      if (!this.omx) {
        this.omx = new OmxPlayer({ source, loop, output, noOsd }, onSuccess);
      } else {
        this.omx.newSource({ source, loop, output, noOsd }, onSuccess);
      }
    });
  }

  public getInitialState(status: string): Observable<any> {
    const actions = [
      of({
        status,
        isPending: this.state.isPending,
        meta: this.state.meta,
      }),
    ];
    if (status !== PlaybackStatus.STOPPED.toString()) {
      actions.push(from(this.getDuration()));
      actions.push(from(this.getVolume()));
    }
    return forkJoin(actions).pipe(map(mergeAll));
  }

  public async getDuration(): Promise<any> {
    try {
      const duration: number = await promisifyAndBind(
        this.omx.getDuration,
        this.omx,
      )();
      return {
        duration: Math.round(duration / 1000 / 1000),
      };
    } catch (err) {
      throw new WsException(Errors.PLAYER_UNAVAILABLE);
    }
  }

  public async play(): Promise<any> {
    try {
      await promisifyAndBind(this.omx.play, this.omx)();
      this.status$.next(PlaybackStatus.PLAYING);
    } catch (err) {
      throw new WsException(Errors.PLAYER_UNAVAILABLE);
    }
  }

  public async pause() {
    try {
      await promisifyAndBind(this.omx.pause, this.omx)();
      this.status$.next(PlaybackStatus.PAUSED);
    } catch (err) {
      throw new WsException(Errors.PLAYER_UNAVAILABLE);
    }
  }

  // public getStatus(): Observable<any> {
  //   return bindCallback(this.omx.getPlaybackStatus.bind(this.omx))().pipe(
  //     map(status => ({
  //       status,
  //     })),
  //     catchError(() => throwError(Errors.PLAYER_UNAVAILABLE)),
  //   );
  // }

  public async getPosition(): Promise<any> {
    try {
      const position = await promisifyAndBind(this.omx.getPosition, this.omx)();
      return { position: Math.round(position / 1000 / 1000) };
    } catch (err) {
      throw new WsException(Errors.PLAYER_UNAVAILABLE);
    }
  }

  public async setPosition(position: number): Promise<any> {
    try {
      await promisifyAndBind(this.omx.setPosition, this.omx)(
        position * 1000 * 1000,
      );
      this.state.isPending = false;
      return position;
    } catch (err) {
      throw new WsException(Errors.PLAYER_UNAVAILABLE);
    }
  }

  public async quit(): Promise<any> {
    try {
      await promisifyAndBind(this.omx.quit, this.omx)();
      this.status$.next(PlaybackStatus.STOPPED);
    } catch (err) {
      throw new WsException(Errors.PLAYER_UNAVAILABLE);
    }
  }

  public async seek(position: number): Promise<any> {
    try {
      this.state.isPending = true;
      await promisifyAndBind(this.omx.seek, this.omx)(position);
      this.state.isPending = false;
      return position;
    } catch (err) {
      throw new WsException(Errors.PLAYER_UNAVAILABLE);
    }
  }

  public async setVolume(volume: number): Promise<any> {
    try {
      this.state.volume = volume;
      await promisifyAndBind(this.omx.setVolume, this.omx)(volume);
    } catch (err) {
      throw new WsException(Errors.PLAYER_UNAVAILABLE);
    }
  }

  public async getVolume(): Promise<any> {
    if (this.state.volume) {
      return Promise.resolve(this.state.volume);
    } else {
      const volume = await promisifyAndBind(this.omx.getVolume, this.omx)();
      this.state.volume = volume;
      return { volume };
    }
  }

  public async increaseVolume(): Promise<any> {
    try {
      this.state.volume = undefined;
      await promisifyAndBind(this.omx.increaseVolume, this.omx)();
      return this.getVolume();
    } catch (err) {
      throw new WsException(Errors.PLAYER_UNAVAILABLE);
    }
  }

  public async decreaseVolume(): Promise<any> {
    try {
      this.state.volume = undefined;
      await promisifyAndBind(this.omx.decreaseVolume, this.omx)();
      return this.getVolume();
    } catch (err) {
      throw new WsException(Errors.PLAYER_UNAVAILABLE);
    }
  }

  public isPlaying(): boolean {
    return (
      this.status$.getValue() === PlaybackStatus.PLAYING &&
      !!this.omx &&
      this.omx.running &&
      !this.state.isPending
    );
  }

  public setMeta(meta: CastMeta): void {
    this.state.meta = {
      title: meta.title,
      description: meta.description,
      thumbnail: meta.thumbnail,
      url: meta.url,
    };
  }

  private resetState(): void {
    this.state = {
      ...this.state,
      isPending: false,
      meta: undefined,
    };
  }
}
