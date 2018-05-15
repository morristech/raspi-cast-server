import { CastMeta } from './CastMeta';

export interface PlayerState {
  volume?: number;
  isPlaying: boolean;
  meta?: CastMeta;
  castId?: string;
  locked?: boolean;
  masterAdress?: string;
}
