import { UserRole } from '@prisma/client';

export interface JwtPayload {
  sub: string;
  tenantId: string;
  role: UserRole;
  phone: string;
}

export interface JwtRefreshPayload {
  sub: string;
  tokenId: string;
}
