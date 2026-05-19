import redis.asyncio as redis
import structlog
from typing import Optional
from app.config import settings

logger = structlog.get_logger(__name__)

class RedisClient:
    def __init__(self):
        self.client: Optional[redis.Redis] = None

    async def connect(self):
        if self.client is None:
            try:
                self.client = redis.from_url(
                    settings.REDIS_URL,
                    decode_responses=True,
                    socket_timeout=5.0
                )
                await self.client.ping()
                logger.info("Connected to Redis successfully")
            except Exception as e:
                logger.error("Failed to connect to Redis", error=str(e))
                raise e

    async def disconnect(self):
        if self.client is not None:
            await self.client.close()
            self.client = None
            logger.info("Redis connection closed successfully")

    async def get(self, key: str) -> Optional[str]:
        if self.client is None:
            return None
        try:
            return await self.client.get(key)
        except Exception as e:
            logger.error("Redis get error", key=key, error=str(e))
            return None

    async def set(self, key: str, value: str, ex: Optional[int] = None) -> bool:
        if self.client is None:
            return False
        try:
            await self.client.set(key, value, ex=ex)
            return True
        except Exception as e:
            logger.error("Redis set error", key=key, error=str(e))
            return False

    async def delete(self, key: str) -> bool:
        if self.client is None:
            return False
        try:
            await self.client.delete(key)
            return True
        except Exception as e:
            logger.error("Redis delete error", key=key, error=str(e))
            return False

    async def delete_pattern(self, pattern: str) -> int:
        """Find keys matching a pattern and delete them."""
        if self.client is None:
            return 0
        try:
            count = 0
            # Use SCAN instead of KEYS to avoid blocking Redis
            cursor = 0
            while True:
                cursor, keys = await self.client.scan(cursor, match=pattern, count=100)
                if keys:
                    await self.client.delete(*keys)
                    count += len(keys)
                if cursor == 0:
                    break
            logger.info("Deleted Redis keys by pattern", pattern=pattern, count=count)
            return count
        except Exception as e:
            logger.error("Redis delete_pattern error", pattern=pattern, error=str(e))
            return 0

redis_client = RedisClient()
