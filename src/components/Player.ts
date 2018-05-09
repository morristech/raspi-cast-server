import { Component } from '@nestjs/common';
import OmxPlayer from 'node-omxplayer-raspberry-pi-cast';
import path from 'path';

import { PlaybackStatus } from '../enums/PlaybackStatus';
import { PlayerState } from '../types/PlayerState';

const defaultOptions = {
  source: path.join(process.cwd(), 'assets/loading-screen.mp4'),
  output: 'both',
  loop: true,
  noOsd: true,
};

@Component()
export class Player {
  public omx: OmxPlayer;
  public state: PlayerState = {
    playing: false,
    loading: false,
  };

  public init(options = defaultOptions): Promise<void> {
    if (!this.omx) {
      this.omx = new OmxPlayer(options);
      return Promise.resolve();
    } else {
      return this.omx.newSource(options);
    }
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
