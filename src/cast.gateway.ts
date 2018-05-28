import { Inject, UseFilters, UseInterceptors } from '@nestjs/common';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WsResponse,
} from '@nestjs/websockets';
import autobind from 'autobind-decorator';
import { CastOptions, InitialState } from 'raspi-cast-common';
import { from, interval, Observable, Subscription } from 'rxjs';
import { filter, map, mapTo, switchMap, tap } from 'rxjs/operators';
import { Socket } from 'socket.io';
// import uuid from 'uuid';

import { CastExceptionFilter } from './common/exception.filter';
import { LoggingInterceptor } from './common/logger.interceptor';
import { VideoPlayer } from './common/player.interface';
import { Screen } from './common/screen.service';
import { VideoStream } from './stream/videoStream.service';

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
    @Inject('Player') private player: VideoPlayer,
    @Inject(Screen) private screen: Screen,
    @Inject(VideoStream) private videoStream: VideoStream,
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
    return this.player
      .getInitialState()
      .pipe(map(data => ({ event: 'initialState', data })));
  }

  @SubscribeMessage('cast')
  public handleCast(
    client: Socket,
    options: CastOptions,
  ): Observable<WsResponse<InitialState | any>> {
    return this.player
      .init(undefined, true, 'both', true)
      .pipe(
        switchMap(() => this.videoStream.getMetaInfo(options)),
        tap(this.player.setMeta),
        tap(this.screen.clear),
        switchMap(({ url }) => this.player.init(url)),
        tap(this.listenPlayerClose),
        switchMap(this.player.getInitialState),
        map(data => ({ event: 'cast', data })),
      );
  }

  @SubscribeMessage('seek')
  public handleSeek(client: Socket, data: string): Observable<WsResponse<any>> {
    return from(this.player.setPosition(Number(data))).pipe(
      mapTo({ event: 'seek', data: { isSeeking: false } }),
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

  @UseFilters(new CastExceptionFilter())
  @SubscribeMessage('volume')
  public async handleVolume(client: Socket, data: string): Promise<void> {
    await this.player.setVolume(parseFloat(data));
  }

  @autobind
  private listenPlayerClose(): void {
    this.player.close$.toPromise().then(this.screen.printIp);
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
