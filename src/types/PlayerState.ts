import { CastMeta } from './CastMeta';

export interface PlayerState {
  playing: boolean;
  loading: boolean;
  meta?: CastMeta;
  castId?: string;
  locked?: boolean;
  masterAdress?: string;
}
