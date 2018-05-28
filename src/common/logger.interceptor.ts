import { ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';

import { logger } from '../helpers/logger';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  public intercept(
    context: ExecutionContext,
    call$: Observable<any>,
  ): Observable<any> {
    const now = Date.now();
    return call$.pipe(
      tap((data: any) => console.info(`${Date.now() - now}ms - ${data.event}`)),
      catchError(err => {
        logger.error(err);

        return of({ event: 'fail', data: err });
      }),
    );
  }
}
