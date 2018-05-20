import { Subscription } from 'rxjs';
import { Socket } from 'socket.io';

export interface InitialState {
  isPending: boolean;
  status: string;
  meta: {
    title: string;
    description: string;
    thumbnail: string;
  };
  duration?: number;
  volume?: number;
}

export interface CastClient {
  address: string;
  socket: Socket;
  subscription: Subscription;
}
