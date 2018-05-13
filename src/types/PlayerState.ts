import { CastMeta } from './CastMeta';

export interface PlayerState {
  volume?: number;
  meta?: CastMeta;
  castId?: string;
  locked?: boolean;
  masterAdress?: string;
}
