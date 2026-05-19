import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const tenantId = req.headers['x-tenant-id'];
    
    // Make tenantId available in request context if provided
    if (tenantId && typeof tenantId === 'string') {
      (req as any).tenantId = tenantId;
    }
    
    next();
  }
}
