import { CastMeta, Playback } from 'raspi-cast-common';
import { BehaviorSubject, Observable } from 'rxjs';

export interface VideoPlayer {
  close$: Observable<void>;
  status$: BehaviorSubject<Playback>;

  init: (source?: string, ...args: any[]) => Observable<any>;
  getInitialState: () => Observable<any>;
  getDuration: () => Promise<any>;
  play: () => Promise<any>;
  pause: () => Promise<any>;
  getPosition: () => Promise<any>;
  setPosition: (position: number) => Promise<any>;
  quit: () => Promise<any>;
  seek: (position: number) => Promise<any>;
  setVolume: (volume: number) => Promise<any>;
  getVolume: () => Promise<any>;
  isPlaying: () => boolean;
  setMeta: (meta: CastMeta) => void;
}
