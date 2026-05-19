import asyncpg
import structlog
from typing import Optional
from app.config import settings

logger = structlog.get_logger(__name__)

class Database:
    def __init__(self):
        self.pool: Optional[asyncpg.Pool] = None

    async def connect(self):
        if self.pool is None:
            try:
                # Max 10 connections as requested
                self.pool = await asyncpg.create_pool(
                    settings.DATABASE_URL,
                    min_size=2,
                    max_size=10,
                    timeout=30.0,
                    command_timeout=60.0
                )
                logger.info("Database connection pool established successfully")
            except Exception as e:
                logger.error("Failed to establish database connection pool", error=str(e))
                raise e

    async def disconnect(self):
        if self.pool is not None:
            await self.pool.close()
            self.pool = None
            logger.info("Database connection pool closed successfully")

    async def fetch(self, query: str, *args):
        """Execute a read-only query and return all rows."""
        if self.pool is None:
            raise RuntimeError("Database pool is not initialized")
        
        async with self.pool.acquire() as conn:
            # Enforce read-only at the transaction level
            async with conn.transaction(readonly=True):
                return await conn.fetch(query, *args)

    async def fetchrow(self, query: str, *args):
        """Execute a read-only query and return a single row."""
        if self.pool is None:
            raise RuntimeError("Database pool is not initialized")
        
        async with self.pool.acquire() as conn:
            async with conn.transaction(readonly=True):
                return await conn.fetchrow(query, *args)

    async def fetchval(self, query: str, *args):
        """Execute a read-only query and return a single value."""
        if self.pool is None:
            raise RuntimeError("Database pool is not initialized")
        
        async with self.pool.acquire() as conn:
            async with conn.transaction(readonly=True):
                return await conn.fetchval(query, *args)

db = Database()
