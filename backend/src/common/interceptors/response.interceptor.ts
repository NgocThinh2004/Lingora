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
      map(data => {
        // If the data is already in { data, meta } format, return it directly
        if (data && typeof data === 'object' && ('data' in data || 'meta' in data) && Object.keys(data).length <= 2) {
          return {
            data: data.data !== undefined ? data.data : null,
            meta: data.meta
          };
        }
        
        return { data };
      }),
    );
  }
}
