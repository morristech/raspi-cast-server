import { Inject } from '@nestjs/common';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WsResponse,
} from '@nestjs/websockets';
import autobind from 'autobind-decorator';
import {
  CastOptions,
  CastType,
  Errors,
  InitialState,
  Playback,
  PlaybackStatus,
} from 'raspi-cast-common';
import { forkJoin, from, interval, Observable, of, Subscription } from 'rxjs';
import { catchError, delay, filter, map, switchMap, tap } from 'rxjs/operators';
import { Socket } from 'socket.io';
// import uuid from 'uuid';

import { Player } from './common/player.service';
import { Screen } from './common/screen.service';
import { YoutubeDl } from './youtubedl/youtubeDl.service';

interface CastClient {
  address: string;
  socket: Socket;
  subscription: Subscription;
}

@WebSocketGateway()
export class CastSocket implements OnGatewayConnection, OnGatewayDisconnect {
  private clients: CastClient[] = [];

  constructor(
    @Inject(Screen) private screen: Screen,
    @Inject(Player) private player: Player,
    @Inject(YoutubeDl) private youtubeDl: YoutubeDl,
  ) {
    this.player.close$.subscribe(() => {
      this.notifyStatusChange(PlaybackStatus.STOPPED);
      if (process.env.NODE_ENV === 'production') {
        this.screen.printIp();
      }
    });
  }

  @autobind
  public handleConnection(socket: Socket) {
    const address = socket.request.connection.remoteAddress;
    const subscription = interval(1000)
      .pipe(
        filter(() => this.player.isPlaying() && !this.player.state.isPending),
        switchMap(() => this.player.getPosition()),
      )
      .subscribe(position => socket.emit('position', position));

    this.clients.push({
      socket,
      address,
      subscription,
    });
  }

  public handleDisconnect(socket: Socket) {
    const client = this.clients.find(
      ({ address }) => address === socket.request.connection.remoteAddress,
    );

    if (client) {
      client.subscription.unsubscribe();
      this.clients.splice(this.clients.indexOf(client), 1);
    }
  }

  @SubscribeMessage('initialState')
  public handleInitialState(
    client: Socket,
  ): Observable<WsResponse<InitialState | string>> {
    const data: any = {
      isPending: false,
      status: PlaybackStatus.STOPPED,
      meta: this.player.getMeta(),
    };
    return !!this.player.omx && this.player.omx.running
      ? from(this.player.getStatus()).pipe(
          switchMap(({ status }) => {
            const actions = [of({ status })];
            if (status === PlaybackStatus.PLAYING.toString()) {
              actions.push(from(this.player.getDuration()));
              actions.push(from(this.player.getVolume()));
            }
            return forkJoin(actions);
          }),
          map(results =>
            results.reduce(
              (acc, result) => ({
                ...acc,
                ...result,
              }),
              data,
            ),
          ),
          map(state => ({ event: 'initialState', data: state })),
          catchError(err =>
            of({ event: 'error', data: Errors.PLAYER_UNAVAILABLE }),
          ),
        )
      : of({ event: 'initialState', data });
  }

  @SubscribeMessage('cast')
  public handleCast(
    client: Socket,
    options: CastOptions,
  ): Observable<WsResponse<InitialState | string>> {
    this.notifyStatusChange(PlaybackStatus.STOPPED);

    return from(this.player.init(undefined, true, 'both', true)).pipe(
      switchMap(() => {
        switch (options.type) {
          case CastType.YOUTUBEDL:
          default:
            return this.youtubeDl.getInfo(options.data);
        }
      }),
      // tap(() => this.screen.clear()),
      switchMap(({ url }) => this.player.init(url)),
      delay(5000),
      tap(() => (this.player.state.isPlaying = true)),
      switchMap(() => this.handleInitialState(client)),
      catchError(err => of({ event: 'error', data: err })),
    );
  }

  @SubscribeMessage('play')
  public async handlePlay(client: Socket): Promise<void> {
    try {
      await this.player.play();
      this.notifyStatusChange(PlaybackStatus.PLAYING);
    } catch (err) {
      client.emit('error', Errors.PLAYER_UNAVAILABLE);
    }
  }

  @SubscribeMessage('pause')
  public async handlePause(client: Socket): Promise<void> {
    try {
      await this.player.pause();
      this.notifyStatusChange(PlaybackStatus.PAUSED);
    } catch (err) {
      client.emit('error', Errors.PLAYER_UNAVAILABLE);
    }
  }

  @SubscribeMessage('quit')
  public async handleQuit(client: Socket): Promise<void> {
    try {
      await this.player.quit();
      this.notifyStatusChange(PlaybackStatus.STOPPED);
    } catch (err) {
      client.emit('error', Errors.PLAYER_UNAVAILABLE);
    }
  }

  @SubscribeMessage('seek')
  public handleSeek(client: Socket, data: string): Observable<WsResponse<any>> {
    return from(this.player.setPosition(Number(data))).pipe(
      map(() => ({ event: 'seek', data: { isSeeking: false } })),
      catchError(err =>
        of({ event: 'error', data: Errors.PLAYER_UNAVAILABLE }),
      ),
    );
  }

  @SubscribeMessage('volume')
  public async handleVolume(client: Socket, data: string): Promise<any> {
    try {
      await this.player.setVolume(parseFloat(data));
    } catch (err) {
      client.emit('error', Errors.PLAYER_UNAVAILABLE);
    }
  }

  @SubscribeMessage('volume+')
  public handleIncreaseVolume(): void {
    this.player.increaseVolume();
  }

  @SubscribeMessage('volume-')
  public handleDecreaseVolume(): void {
    this.player.decreaseVolume();
  }

  // @SubscribeMessage('showSubtitles')
  // public handleShowSubtitles(): Observable<WsResponse<any>> {
  //   return from(this.player.omx.showSubtitles());
  // }

  // @SubscribeMessage('hideSubtitles')
  // public handleHideSubtitles(): Observable<WsResponse<any>> {
  //   return from(this.player.omx.showSubtitles());
  // }

  private notifyStatusChange(status: Playback): void {
    this.clients.forEach(client => {
      client.socket.emit('status', { status });
    });
  }
}
