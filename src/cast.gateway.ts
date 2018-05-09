import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WsResponse,
} from '@nestjs/websockets';
import { from, interval, Observable, of } from 'rxjs';
import { filter, map, switchMap, tap } from 'rxjs/operators';
import { Client, Socket } from 'socket.io';
// import uuid from 'uuid';

import { Player } from './components/Player';
import { Screen } from './components/Screen';
import { YoutubeDl } from './components/YoutubeDl';
import { PlaybackStatus } from './enums/PlaybackStatus';
import { CastClient } from './types/CastClient';

@WebSocketGateway()
export class CastSocket implements OnGatewayConnection, OnGatewayDisconnect {
  private clients: CastClient[] = [];

  constructor(
    private screen: Screen,
    private player: Player,
    private youtubeDl: YoutubeDl,
  ) {}

  public handleConnection(socket: Socket) {
    const address = socket.request.connection.remoteAddress;
    const subscription = interval(500)
      .pipe(
        filter(() => this.player.omx.running && this.player.state.playing),
        switchMap(this.player.omx.getPosition),
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

  @SubscribeMessage('foo')
  public foo() {
    return of('foo');
  }

  @SubscribeMessage('cast')
  public handleCast(client: Client, data: any): Observable<WsResponse<any>> {
    this.player.state.playing = false;
    this.notifyStatusChange(PlaybackStatus.STOPPED);
    this.player.state.loading = true;
    // this.player.state.castId = uuid();
    this.player.init();

    return from(this.youtubeDl.getInfo(data)).pipe(
      tap(() => this.screen.clear()),
      switchMap(info =>
        this.player.init({
          source: info.url,
          output: 'both',
          loop: true,
          noOsd: true,
        }),
      ),
      tap(() => {
        this.player.omx.on('close', () => {
          this.player.state.playing = false;
          this.notifyStatusChange(PlaybackStatus.STOPPED);
          this.screen.printIp();
        });
        this.player.state.loading = false;
      }),
      switchMap(() => this.player.omx.getDuration()),
      tap(() => {
        this.player.state.playing = true;
        this.notifyStatusChange(PlaybackStatus.PLAYING);
      }),
    );
  }

  @SubscribeMessage('play')
  public handlePlay(): Observable<WsResponse<any>> {
    return from(this.player.omx.play()).pipe(
      tap(() => {
        this.player.state.playing = true;
        this.notifyStatusChange(PlaybackStatus.PLAYING);
      }),
    );
  }

  @SubscribeMessage('pause')
  public handlePause(): Observable<WsResponse<any>> {
    return from(this.player.omx.pause()).pipe(
      tap(() => {
        this.player.state.playing = false;
        this.notifyStatusChange(PlaybackStatus.PAUSED);
      }),
    );
  }

  @SubscribeMessage('status')
  public handleStatus(): Observable<WsResponse<any>> {
    return from(this.player.omx.getPlaybackStatus());
  }

  @SubscribeMessage('duration')
  public handleDuration(): Observable<WsResponse<any>> {
    return from(this.player.omx.getDuration());
  }

  @SubscribeMessage('position')
  public handlePosition(
    client: Socket,
    data: any,
  ): Observable<WsResponse<any>> {
    return from(
      data
        ? this.player.omx.setPosition(Number(data))
        : this.player.omx.getPosition(),
    ).pipe(map(pos => (pos < 0 ? 0 : pos)));
  }

  @SubscribeMessage('quit')
  public handleQuit(client: Socket, data: any): Observable<WsResponse<any>> {
    return from(this.player.omx.quit()).pipe(
      tap(() => {
        this.player.state.playing = false;
        this.notifyStatusChange(PlaybackStatus.STOPPED);
      }),
    );
  }

  @SubscribeMessage('seek')
  public handleSeek(client: Socket, data: any): Observable<WsResponse<any>> {
    return from(this.player.omx.seek(Number(data)));
  }

  @SubscribeMessage('increaseVolume')
  public handleIncreaseVolume(): Observable<WsResponse<any>> {
    return from(this.player.omx.increaseVolume());
  }

  @SubscribeMessage('decreaseVolume')
  public handleDecreaseVolume(): Observable<WsResponse<any>> {
    return from(this.player.omx.decreaseVolume());
  }

  @SubscribeMessage('volume')
  public handleVolume(client: Socket, data: any): Observable<WsResponse<any>> {
    return from(
      data
        ? this.player.omx.setVolume(parseFloat(data))
        : this.player.omx.getVolume(),
    );
  }

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
      client.socket.emit('playbackStatus', status);
    });
  }
}
