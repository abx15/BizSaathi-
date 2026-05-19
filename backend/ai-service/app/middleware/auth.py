import time
from fastapi import Request, HTTPException
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from jose import jwt, JWTError
import structlog
from app.config import settings

logger = structlog.get_logger(__name__)

# Endpoints that bypass JWT verification
PUBLIC_PATHS = [
    "/health",
    "/v1/ai/health",
    "/v1/ai/webhook"
]

class JWTAuthMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # 1. Bypass public paths
        path = request.url.path
        if any(path == p or path.startswith(p + "/") for p in PUBLIC_PATHS):
            return await call_next(request)

        # 2. Extract authorization header
        auth_header = request.headers.get("Authorization")
        if not auth_header:
            logger.warn("Missing Authorization header", path=path)
            return JSONResponse(
                status_code=401,
                content={
                    "success": False,
                    "error": {
                        "code": "UNAUTHORIZED",
                        "message": "Authorization header is missing",
                        "statusCode": 401
                    }
                }
            )

        parts = auth_header.split()
        if len(parts) != 2 or parts[0].lower() != "bearer":
            logger.warn("Invalid Authorization header format", path=path)
            return JSONResponse(
                status_code=401,
                content={
                    "success": False,
                    "error": {
                        "code": "UNAUTHORIZED",
                        "message": "Authorization header must be Bearer token",
                        "statusCode": 401
                    }
                }
            )

        token = parts[1]

        # 3. Verify and decode JWT
        try:
            payload = jwt.decode(
                token,
                settings.JWT_ACCESS_SECRET,
                algorithms=["HS256"]
            )
            
            # 4. Extract claims and inject into request state
            user_id = payload.get("sub")
            tenant_id = payload.get("tenantId")
            role = payload.get("role")
            phone = payload.get("phone")

            if not tenant_id:
                logger.warn("JWT payload missing tenantId", path=path)
                return JSONResponse(
                    status_code=401,
                    content={
                        "success": False,
                        "error": {
                            "code": "UNAUTHORIZED",
                            "message": "Invalid token payload: tenantId missing",
                            "statusCode": 401
                        }
                    }
                )

            request.state.user_id = user_id
            request.state.tenant_id = tenant_id
            request.state.role = role
            request.state.phone = phone

            # Also allow extracting X-Tenant-ID from headers as validation
            x_tenant_id = request.headers.get("X-Tenant-ID")
            if x_tenant_id and x_tenant_id != tenant_id:
                logger.warn("Tenant ID mismatch in JWT vs X-Tenant-ID header", jwt_tenant=tenant_id, header_tenant=x_tenant_id)
                return JSONResponse(
                    status_code=403,
                    content={
                        "success": False,
                        "error": {
                            "code": "FORBIDDEN",
                            "message": "Tenant ID mismatch",
                            "statusCode": 403
                        }
                    }
                )

        except jwt.ExpiredSignatureError:
            logger.warn("JWT expired", path=path)
            return JSONResponse(
                status_code=401,
                content={
                    "success": False,
                    "error": {
                        "code": "UNAUTHORIZED",
                        "message": "Token has expired",
                        "statusCode": 401
                    }
                }
            )
        except JWTError as e:
            logger.warn("JWT validation error", path=path, error=str(e))
            return JSONResponse(
                status_code=401,
                content={
                    "success": False,
                    "error": {
                        "code": "UNAUTHORIZED",
                        "message": "Invalid token",
                        "statusCode": 401
                    }
                }
            )

        # Proceed
        return await call_next(request)
