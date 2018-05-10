import { Component } from '@nestjs/common';
import OmxPlayer from 'node-omxplayer-raspberry-pi-cast';
import path from 'path';

import { PlaybackStatus } from '../enums/PlaybackStatus';
import { PlayerState } from '../types/PlayerState';

const defaultOptions = {
  output: 'both',
  noOsd: true,
};

const spinner = path.join(process.cwd(), 'assets/loading-screen.mp4');

@Component()
export class Player {
  public omx: OmxPlayer;
  public state: PlayerState = {
    playing: false,
    loading: false,
  };

  public init(source = spinner, loop = false): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.omx) {
        this.omx = new OmxPlayer(
          { source, loop, ...defaultOptions },
          (err, data) => {
            if (err) {
              reject(err);
            } else {
              resolve(data);
            }
          },
        );
      } else {
        this.omx.newSource({ source, loop, ...defaultOptions }, (err, data) => {
          if (err) {
            reject(err);
          } else {
            resolve(data);
          }
        });
      }
    });
  }

  public getDuration() {
    return new Promise((resolve, reject) => {
      this.omx.getDuration((err: any, duration: any) => {
        if (err) {
          reject(err);
        } else {
          resolve(duration);
        }
      });
    });
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
