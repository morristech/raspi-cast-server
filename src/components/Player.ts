import { Component } from '@nestjs/common';
import OmxPlayer from 'node-omxplayer-raspberry-pi-cast';
import path from 'path';
import { fromEvent, Subject } from 'rxjs';
import { merge } from 'rxjs/operators';
import { promisify } from 'util';

import { PlaybackStatus } from '../enums/PlaybackStatus';
import { PlayerState } from '../types/PlayerState';

const spinner = path.join(process.cwd(), 'assets/loading-screen.mp4');

@Component()
export class Player {
  public close$ = new Subject<void>();
  public omx: OmxPlayer;
  public state: PlayerState = {};

  public init(
    source = spinner,
    loop = false,
    output = 'both',
    noOsd = false,
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.omx) {
        this.omx = new OmxPlayer(
          { source, loop, output, noOsd },
          (err, data) => {
            if (err) {
              console.error(err);
              reject(err);
            } else {
              resolve(data);
            }
          },
        );
      } else {
        this.omx.newSource({ source, loop, output, noOsd }, (err, data) => {
          if (err) {
            reject(err);
          } else {
            resolve(data);
          }
        });
      }

      this.close$.pipe(merge(fromEvent(this.omx as any, 'close')));
    });
  }

  public getDuration(): Promise<any> {
    return this.promisifyAndBind(this.omx.getDuration)();
  }

  public play(): Promise<any> {
    return this.promisifyAndBind(this.omx.play)();
  }

  public pause() {
    return this.promisifyAndBind(this.omx.pause)();
  }

  public getStatus(): Promise<any> {
    return this.promisifyAndBind(this.omx.getPlaybackStatus)();
  }

  public getPosition(): Promise<any> {
    return this.promisifyAndBind(this.omx.getPosition)();
  }

  public setPosition(position: number): Promise<any> {
    return this.promisifyAndBind(this.omx.setPosition)(position);
  }

  public quit(): Promise<any> {
    return this.promisifyAndBind(this.omx.quit)();
  }

  public seek(position: number): Promise<any> {
    return this.promisifyAndBind(this.omx.seek)(position);
  }

  public setVolume(volume: number): Promise<any> {
    this.state.volume = volume;
    return this.promisifyAndBind(this.omx.setVolume)(volume);
  }

  public getVolume(): Promise<any> {
    if (this.state.volume) {
      return Promise.resolve(this.state.volume);
    } else {
      return this.promisifyAndBind(this.omx.getVolume)().then(
        (volume: number) => {
          this.state.volume = volume;
          return volume;
        },
      );
    }
  }

  public isPlaying(): boolean {
    return this.omx && this.omx.running;
  }

  public getPlaybackStatus(): string {
    return !!this.omx
      ? this.isPlaying()
        ? PlaybackStatus.PLAYING
        : PlaybackStatus.PAUSED
      : PlaybackStatus.STOPPED;
  }

  private promisifyAndBind(method: any) {
    return promisify(method.bind(this.omx));
  }
}