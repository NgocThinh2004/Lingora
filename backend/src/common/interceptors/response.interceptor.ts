import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Response<T> {
  data: T;
  meta?: any;
}

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, Response<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<Response<T>> {
    return next.handle().pipe(
      map((data) => {
        if (!data || typeof data !== 'object') {
          return { data };
        }

        // Controllers may already return the application's { data, meta? } envelope.
        if ('data' in data) {
          return data;
        }

        // If object contains `items` and `meta` (like listFeed)
        if ('items' in data && 'meta' in data) {
          return {
            data: {
              items: data.items,
              meta: data.meta,
            },
          };
        }

        return { data };
      }),
    );
  }
}
