import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface StandardResponse<T> {
  success: boolean;
  data: T;
  status: number;
  message: string;
}

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, StandardResponse<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<StandardResponse<T>> {
    const httpContext = context.switchToHttp();
    const response = httpContext.getResponse();

    return next.handle().pipe(
      map((data) => {
        const statusCode: number = response.statusCode ?? 200;

        // If controller already returns the full { success, data, status, message } envelope
        if (data && typeof data === 'object' && 'success' in data && 'data' in data) {
          return data;
        }

        // Paginated result: controller returns { items: T[], meta: {...} }
        // → flatten to: data = items[], meta stays at top level
        if (data && typeof data === 'object' && 'items' in data && 'meta' in data) {
          return {
            success: true,
            data: data.items,
            meta: data.meta,
            status: statusCode,
            message: 'ok',
          };
        }

        // Arrays, objects, null, primitives → wrap directly
        return {
          success: true,
          data: data ?? null,
          status: statusCode,
          message: 'ok',
        };
      }),
    );
  }
}
