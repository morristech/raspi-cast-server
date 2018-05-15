import { Inject } from '@nestjs/common';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WsResponse,
} from '@nestjs/websockets';
import autobind from 'autobind-decorator';
// import fs from 'fs';
// import path from 'path';
import { forkJoin, from, interval, Observable, of } from 'rxjs';
import { delay, filter, map, switchMap, tap } from 'rxjs/operators';
import { Server, Socket } from 'socket.io';
// import socketLogger from 'socket.io-logger';
// import uuid from 'uuid';

import { Player } from './components/Player';
import { Screen } from './components/Screen';
import { YoutubeDl } from './components/YoutubeDl';
import { CastType } from './enums/CastType';
import { PlaybackStatus } from './enums/PlaybackStatus';
import { CastClient } from './types/CastClient';
import { CastOptions } from './types/CastOptions';

@WebSocketGateway()
export class CastSocket
  implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit {
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

  public afterInit(io: Server) {
    // const options = {
    //   stream:
    //     process.env.NODE_ENV === 'production'
    //       ? fs.createWriteStream(path.join(process.cwd(), 'logs/socket.log'), {
    //           flags: 'a',
    //         })
    //       : process.stdout,
    // };
    // io.use(socketLogger(options));
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
        )
      : of({ event: 'initialState', data });
  }

  @SubscribeMessage('cast')
  public handleCast(
    client: Socket,
    options: CastOptions,
  ): Observable<WsResponse<any>> {
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
    );
  }

  @SubscribeMessage('play')
  public async handlePlay() {
    await this.player.play();
    this.notifyStatusChange(PlaybackStatus.PLAYING);
  }

  @SubscribeMessage('pause')
  public async handlePause() {
    await this.player.pause();
    this.notifyStatusChange(PlaybackStatus.PAUSED);
  }

  @SubscribeMessage('quit')
  public async handleQuit() {
    await this.player.quit();
    this.notifyStatusChange(PlaybackStatus.STOPPED);
  }

  @SubscribeMessage('seek')
  public handleSeek(client: Socket, data: any): Observable<WsResponse<any>> {
    return from(this.player.seek(Number(data))).pipe(
      map(seek => ({ event: 'seek', data: seek })),
    );
  }

  @SubscribeMessage('volume')
  public handleVolume(client: Socket, data: any): Observable<WsResponse<any>> {
    return from(
      data ? this.player.setVolume(parseFloat(data)) : this.player.getVolume(),
    ).pipe(map(volume => ({ event: 'volume', data: { volume } })));
  }

  // @SubscribeMessage('increaseVolume')
  // public handleIncreaseVolume(): Observable<WsResponse<any>> {
  //   return from(this.player.omx.increaseVolume());
  // }

  // @SubscribeMessage('decreaseVolume')
  // public handleDecreaseVolume(): Observable<WsResponse<any>> {
  //   return from(this.player.omx.decreaseVolume());
  // }

  // @SubscribeMessage('showSubtitles')
  // public handleShowSubtitles(): Observable<WsResponse<any>> {
  //   return from(this.player.omx.showSubtitles());
  // }

  // @SubscribeMessage('hideSubtitles')
  // public handleHideSubtitles(): Observable<WsResponse<any>> {
  //   return from(this.player.omx.showSubtitles());
  // }

  private notifyStatusChange(status: PlaybackStatus) {
    this.clients.forEach(client => {
      client.socket.emit('status', { status });
    });
  }
}
