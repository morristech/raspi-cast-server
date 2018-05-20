import { CastMeta } from 'raspi-cast-common';

export interface PlayerState {
  isPending: boolean;
  volume?: number;
  isPlaying: boolean;
  meta?: CastMeta;
  castId?: string;
  locked?: boolean;
  masterAdress?: string;
}
