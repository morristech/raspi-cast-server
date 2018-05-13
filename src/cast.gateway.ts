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
import { from, interval, Observable, of } from 'rxjs';
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
      this.screen.printIp();
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
    const subscription = interval(500)
      .pipe(
        filter(() => !!this.player.omx),
        filter(() => this.player.omx.running && this.player.state.playing),
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

  @SubscribeMessage('cast')
  public handleCast(
    client: Socket,
    options: CastOptions,
  ): Observable<WsResponse<any>> {
    this.player.state.loading = true;
    this.player.state.playing = false;
    this.notifyStatusChange(PlaybackStatus.STOPPED);
    // this.player.state.castId = uuid();
    return from(this.player.init(undefined, true, 'both', true)).pipe(
      switchMap(() => {
        switch (options.type) {
          case CastType.YOUTUBEDL:
          default:
            return this.youtubeDl.getInfo(options.data);
        }
      }),
      tap(({ title, description, thumbnail, url }) => {
        this.screen.clear();
        this.player.state.meta = { title, description, thumbnail, url };
        client.emit('meta', { title, description, thumbnail, url });
      }),
      switchMap(info => this.player.init(info.url)),
      delay(3000), // :'( ... cant make it work without it
      switchMap(() => this.player.getDuration()),
      tap(duration => {
        this.player.state.loading = false;
        this.player.state.playing = true;
        this.notifyStatusChange(PlaybackStatus.PLAYING);
      }),
      map(duration => ({ event: 'duration', data: duration })),
    );
  }

  @SubscribeMessage('play')
  public handlePlay(): Observable<WsResponse<any>> {
    return from(this.player.play()).pipe(
      tap(() => {
        this.player.state.playing = true;
        this.notifyStatusChange(PlaybackStatus.PLAYING);
      }),
      map(data => ({ event: 'play', data })),
    );
  }

  @SubscribeMessage('pause')
  public handlePause(): Observable<WsResponse<any>> {
    return from(this.player.pause()).pipe(
      tap(() => {
        this.player.state.playing = false;
        this.notifyStatusChange(PlaybackStatus.PAUSED);
      }),
      map(data => ({ event: 'pause', data })),
    );
  }

  @SubscribeMessage('status')
  public handleStatus(client: any): Observable<WsResponse<any>> {
    return !!this.player.omx && this.player.omx.running
      ? from(this.player.getStatus()).pipe(
          tap(status => {
            if (status === PlaybackStatus.PLAYING) {
              client.emit('meta', this.player.state.meta);
              this.player
                .getDuration()
                .then(duration => client.emit('duration', duration));
            }
          }),
          map(data => ({ event: 'status', data })),
        )
      : of({ event: 'status', data: PlaybackStatus.STOPPED });
  }

  @SubscribeMessage('duration')
  public handleDuration(): Observable<WsResponse<any>> {
    return from(this.player.getDuration()).pipe(
      map(data => ({ event: 'duration', data })),
    );
  }

  @SubscribeMessage('position')
  public handlePosition(
    client: Socket,
    data: any,
  ): Observable<WsResponse<any>> {
    return from(
      data ? this.player.setPosition(Number(data)) : this.player.getPosition(),
    ).pipe(map(pos => ({ event: 'position', data: pos < 0 ? 0 : pos })));
  }

  @SubscribeMessage('quit')
  public handleQuit(): Observable<WsResponse<any>> {
    return from(this.player.quit()).pipe(
      tap(() => {
        this.player.state.playing = false;
        this.notifyStatusChange(PlaybackStatus.STOPPED);
      }),
      map(data => ({ event: 'quit', data })),
    );
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
    ).pipe(map(volume => ({ event: 'volume', data: volume })));
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
      client.socket.emit('status', status);
    });
  }
}
