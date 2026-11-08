import { CallHandler, ExecutionContext, Injectable, NestInterceptor, BadRequestException } from '@nestjs/common';
import { Observable } from 'rxjs';

@Injectable()
export class TenantInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    
    // Attempt to extract tenantId from the user payload (set by JwtStrategy)
    if (request.user && request.user.tenantId) {
      request.tenantId = request.user.tenantId;
    } else {
      // Fallback: check headers directly if we allow API keys, but mostly it should come from JWT.
      const tenantId = request.headers['x-tenant-id'];
      if (tenantId) {
        request.tenantId = tenantId;
      }
    }

    if (!request.tenantId && !this.isPublicRoute(request.url)) {
      throw new BadRequestException('Tenant ID is missing from the request');
    }

    return next.handle();
  }

  private isPublicRoute(url: string): boolean {
    const publicRoutes = ['/api/auth/login', '/api/docs'];
    return publicRoutes.some(route => url.startsWith(route));
  }
}
