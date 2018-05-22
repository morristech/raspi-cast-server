import { Injectable } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import OmxPlayer from 'node-omxplayer-raspberry-pi-cast';
import path from 'path';
import { CastMeta, Errors } from 'raspi-cast-common';
import { fromEvent, Subject } from 'rxjs';
import { merge, tap } from 'rxjs/operators';

import { promisifyAndBind } from '../helpers/utils';

const spinner = path.join(process.cwd(), 'assets/loading-screen.mp4');

export interface PlayerState {
  isPending: boolean;
  isPlaying: boolean;
  meta?: CastMeta;
  volume?: number;
}

@Injectable()
export class Player {
  public close$ = new Subject<void>();
  private omx: OmxPlayer;
  private state: PlayerState = {
    isPlaying: false,
    isPending: false,
  };

  public init(
    source = spinner,
    loop = false,
    output = 'both',
    noOsd = false,
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      const onSuccess = (err: Error, data: any) => {
        setTimeout(() => {
          console.log('new Omx', err, data);
          if (err) {
            reject(err);
          } else {
            if (source !== spinner) {
              this.state.isPlaying = true;
            }
            resolve(data);
          }
        }, 5000);
      };
      if (!this.omx) {
        this.omx = new OmxPlayer({ source, loop, output, noOsd }, onSuccess);
      } else {
        this.omx.newSource({ source, loop, output, noOsd }, onSuccess);
      }

      this.close$.pipe(
        merge(
          fromEvent(this.omx as any, 'close'),
          tap(() => this.resetState()),
        ),
      );
    });
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
    } catch (err) {
      throw new WsException(Errors.PLAYER_UNAVAILABLE);
    }
  }

  public async pause() {
    try {
      await promisifyAndBind(this.omx.pause, this.omx)();
    } catch (err) {
      throw new WsException(Errors.PLAYER_UNAVAILABLE);
    }
  }

  public async getStatus(): Promise<any> {
    try {
      const status = await promisifyAndBind(
        this.omx.getPlaybackStatus,
        this.omx,
      )();
      return { status };
    } catch (err) {
      console.log('status err', err);
      throw new WsException(Errors.PLAYER_UNAVAILABLE);
    }
  }

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
      this.state.isPlaying &&
      !!this.omx &&
      this.omx.running &&
      !this.state.isPending
    );
  }

  public getMeta(): CastMeta | undefined {
    return this.state.meta;
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
      isPlaying: false,
      meta: undefined,
    };
  }
}
