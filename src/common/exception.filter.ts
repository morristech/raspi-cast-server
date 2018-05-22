import { ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';

import { logger } from '../helpers/logger';

@Catch(WsException)
export class CastExceptionFilter implements ExceptionFilter {
  public catch(exception: WsException, host: ArgumentsHost) {
    const ctx = host.switchToWs();
    const client = ctx.getClient();

    logger.error(exception.message);
    client.emit('fail', exception.message);
  }
}
