import { Component } from '@nestjs/common';
import OmxPlayer from 'node-omxplayer-raspberry-pi-cast';
import path from 'path';
import { promisify } from 'util';

import { PlaybackStatus } from '../enums/PlaybackStatus';
import { PlayerState } from '../types/PlayerState';

const spinner = path.join(process.cwd(), 'assets/loading-screen.mp4');

@Component()
export class Player {
  public omx: OmxPlayer;
  public state: PlayerState = {
    playing: false,
    loading: false,
  };

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
    });
  }

  public getDuration(): Promise<any> {
    return promisify(this.omx.getDuration)();
  }

  public play(): Promise<any> {
    return promisify(this.omx.play)();
  }

  public pause() {
    return promisify(this.omx.pause)();
  }

  public getStatus(): Promise<any> {
    return promisify(this.omx.getPlaybackStatus)();
  }

  public getPosition(): Promise<any> {
    return promisify(this.omx.getPosition)();
  }

  public setPosition(position: number): Promise<any> {
    return promisify(this.omx.setPosition)(position);
  }

  public quit(): Promise<any> {
    return promisify(this.omx.quit)();
  }

  public seek(position: number): Promise<any> {
    return promisify(this.omx.seek)(position);
  }

  public setVolume(volume: number): Promise<any> {
    return promisify(this.omx.setVolume)(volume);
  }

  public getVolume(): Promise<any> {
    return promisify(this.omx.getVolume)();
  }

  public isPlaying(): boolean {
    return this.state.playing && this.omx.running;
  }

  public getPlaybackStatus(): string {
    return !!this.omx
      ? this.isPlaying()
        ? PlaybackStatus.PLAYING
        : PlaybackStatus.PAUSED
      : PlaybackStatus.STOPPED;
  }
}
