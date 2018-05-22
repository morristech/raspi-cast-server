import { Inject, UseFilters } from '@nestjs/common';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WsException,
  WsResponse,
} from '@nestjs/websockets';
import autobind from 'autobind-decorator';
import { mergeAll } from 'ramda';
import {
  CastOptions,
  CastType,
  InitialState,
  Playback,
  PlaybackStatus,
} from 'raspi-cast-common';
import { forkJoin, from, interval, Observable, of, Subscription } from 'rxjs';
import { catchError, filter, map, switchMap, tap } from 'rxjs/operators';
import { Socket } from 'socket.io';
// import uuid from 'uuid';

import { CastExceptionFilter } from './common/exception.filter';
import { Player } from './common/player.service';
import { Screen } from './common/screen.service';
import { logger } from './helpers/logger';
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
    @Inject(Player) private player: Player,
    @Inject(Screen) private screen: Screen,
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
    console.log('connected', address);
    const subscription = interval(1000)
      .pipe(
        filter(() => this.player.isPlaying()),
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
  public handleInitialState(client: Socket): Observable<WsResponse<any>> {
    const data: any = {
      isPending: false,
      status: PlaybackStatus.STOPPED,
      meta: this.player.getMeta(),
    };
    console.log('initial state');
    return this.player.isPlaying()
      ? from(this.player.getStatus()).pipe(
          switchMap(({ status }) => {
            const actions = [of({ status })];
            if (status === PlaybackStatus.PLAYING.toString()) {
              actions.push(from(this.player.getDuration()));
              actions.push(from(this.player.getVolume()));
            }
            return forkJoin(actions);
          }),
          map(mergeAll),
          map(state => ({
            event: 'initialState',
            data: { ...data, ...state },
          })),
          catchError(this.handleError),
        )
      : of({ event: 'initialState', data });
  }

  @SubscribeMessage('cast')
  public handleCast(
    client: Socket,
    options: CastOptions,
  ): Observable<WsResponse<InitialState | any>> {
    this.notifyStatusChange(PlaybackStatus.STOPPED);
    console.log('cast');
    return from(this.player.init(undefined, true, 'both', true)).pipe(
      switchMap(() => {
        switch (options.type) {
          case CastType.YOUTUBEDL:
          default:
            return this.youtubeDl.getInfo(options.data);
        }
      }),
      tap(meta => this.player.setMeta(meta)),
      tap(() => process.env.NODE_ENV === 'production' && this.screen.clear()),
      switchMap(({ url }) => this.player.init(url)),
      switchMap(() => this.handleInitialState(client)),
      catchError(this.handleError),
    );
  }

  @UseFilters(new CastExceptionFilter())
  @SubscribeMessage('play')
  public async handlePlay(client: Socket): Promise<void> {
    await this.player.play();
    this.notifyStatusChange(PlaybackStatus.PLAYING);
  }

  @UseFilters(new CastExceptionFilter())
  @SubscribeMessage('pause')
  public async handlePause(client: Socket): Promise<void> {
    await this.player.pause();
    this.notifyStatusChange(PlaybackStatus.PAUSED);
  }

  @UseFilters(new CastExceptionFilter())
  @SubscribeMessage('quit')
  public async handleQuit(client: Socket): Promise<void> {
    await this.player.quit();
    this.notifyStatusChange(PlaybackStatus.STOPPED);
  }

  @UseFilters(new CastExceptionFilter())
  @SubscribeMessage('seek')
  public handleSeek(client: Socket, data: string): Observable<WsResponse<any>> {
    return from(this.player.setPosition(Number(data))).pipe(
      map(() => ({ event: 'seek', data: { isSeeking: false } })),
    );
  }

  @UseFilters(new CastExceptionFilter())
  @SubscribeMessage('volume')
  public handleVolume(client: Socket, data: string): void {
    this.player.setVolume(parseFloat(data));
  }

  // @SubscribeMessage('volume+')
  // public handleIncreaseVolume(): void {
  //   this.player.increaseVolume();
  // }

  // @SubscribeMessage('volume-')
  // public handleDecreaseVolume(): void {
  //   this.player.decreaseVolume();
  // }

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

  private handleError(err: WsException) {
    logger.error(err);

    return of({ event: 'fail', data: err });
  }
}
