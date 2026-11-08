import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest();
    const { method, url, ip } = request;
    const userAgent = request.get('user-agent') || '';

    const now = Date.now();

    return next
      .handle()
      .pipe(
        tap({
          next: () => {
            const response = ctx.getResponse();
            const { statusCode } = response;
            const delay = Date.now() - now;
            this.logger.log(`${method} ${url} ${statusCode} - ${userAgent} ${ip} - ${delay}ms`);
          },
          error: (error) => {
            const delay = Date.now() - now;
            const statusCode = error.status || 500;
            this.logger.error(`${method} ${url} ${statusCode} - ${userAgent} ${ip} - ${delay}ms`);
          },
        }),
      );
  }
}
