import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Response<T> {
  success: boolean;
  data: T;
  message?: string;
  timestamp: string;
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, Response<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<Response<T>> {
    return next.handle().pipe(
      map(data => {
        // If data already follows the format (like for some custom responses), return it as is
        if (data && typeof data === 'object' && 'success' in data && 'timestamp' in data) {
          return data;
        }

        const message = data?.message;
        
        // Remove message from data if it exists at root level to avoid duplication
        if (data && typeof data === 'object' && data.message) {
          const { message: _msg, ...rest } = data;
          data = Object.keys(rest).length ? rest : undefined;
        }

        return {
          success: true,
          data: data !== undefined ? data : null,
          message: message || 'Request successful',
          timestamp: new Date().toISOString(),
        };
      }),
    );
  }
}
