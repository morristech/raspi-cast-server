import { Subscription } from 'rxjs';
import { Socket } from 'socket.io';

export interface CastClient {
  address: string;
  socket: Socket;
  subscription: Subscription;
}
