import { Inject, UseFilters, UseInterceptors } from '@nestjs/common';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WsResponse,
} from '@nestjs/websockets';
import autobind from 'autobind-decorator';
import { CastOptions, CastType, InitialState } from 'raspi-cast-common';
import { from, interval, Observable, Subscription } from 'rxjs';
import { filter, map, switchMap, tap } from 'rxjs/operators';
import { Socket } from 'socket.io';
// import uuid from 'uuid';

import { CastExceptionFilter } from './common/exception.filter';
import { LoggingInterceptor } from './common/logger.interceptor';
import { Player } from './common/player.service';
import { Screen } from './common/screen.service';
import { logger } from './helpers/logger';
import { YoutubeDl } from './youtubedl/youtubeDl.service';

interface CastClient {
  address: string;
  socket: Socket;
  subscription: Subscription;
}

@UseInterceptors(new LoggingInterceptor())
@WebSocketGateway()
export class CastSocket implements OnGatewayConnection, OnGatewayDisconnect {
  private clients: CastClient[] = [];

  constructor(
    @Inject(Player) private player: Player,
    @Inject(Screen) private screen: Screen,
    @Inject(YoutubeDl) private youtubeDl: YoutubeDl,
  ) {
    this.player.status$.subscribe(status => {
      this.clients.forEach(client => {
        client.socket.emit('status', { status });
      });
    });
  }

  @autobind
  public handleConnection(socket: Socket) {
    const address = socket.request.connection.remoteAddress;
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
    return this.player.status$.pipe(
      switchMap(status => this.player.getInitialState(status)),
      map(data => ({ event: 'initialState', data })),
    );
  }

  @SubscribeMessage('cast')
  public handleCast(
    client: Socket,
    options: CastOptions,
  ): Observable<WsResponse<InitialState | any>> {
    return this.player.init(undefined, true, 'both', true).pipe(
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
      tap(() => {
        this.player.close$
          .pipe(filter(() => process.env.NODE_ENV === 'production'))
          .toPromise()
          .then(() => this.screen.printIp());
      }),
      tap(() => logger.info('cast !!!! gatway')),
      switchMap(() => this.handleInitialState(client)),
    );
  }

  @UseFilters(new CastExceptionFilter())
  @SubscribeMessage('play')
  public async handlePlay(client: Socket): Promise<void> {
    await this.player.play();
  }

  @UseFilters(new CastExceptionFilter())
  @SubscribeMessage('pause')
  public async handlePause(client: Socket): Promise<void> {
    await this.player.pause();
  }

  @UseFilters(new CastExceptionFilter())
  @SubscribeMessage('quit')
  public async handleQuit(client: Socket): Promise<void> {
    await this.player.quit();
  }

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
}
