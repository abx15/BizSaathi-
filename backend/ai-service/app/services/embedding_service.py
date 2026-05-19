import asyncio
from sentence_transformers import SentenceTransformer
import structlog
from typing import List
from app.config import settings

logger = structlog.get_logger(__name__)

class EmbeddingService:
    def __init__(self):
        self.model = None

    def load_model(self):
        """Loads the SentenceTransformer model into memory once."""
        if self.model is None:
            try:
                logger.info("Loading SentenceTransformer model", model=settings.EMBEDDING_MODEL)
                self.model = SentenceTransformer(settings.EMBEDDING_MODEL)
                logger.info("SentenceTransformer model loaded successfully")
            except Exception as e:
                logger.error("Failed to load SentenceTransformer model", error=str(e))
                raise e

    async def embed_text(self, text: str) -> List[float]:
        """Compute the embedding vector for a single text string."""
        if self.model is None:
            self.load_model()
        
        # Run in thread pool to avoid blocking the asyncio event loop
        embeddings = await asyncio.to_thread(self.model.encode, [text])
        return embeddings[0].tolist()

    async def embed_batch(self, texts: List[str]) -> List[List[float]]:
        """Compute embedding vectors for a list of text strings in batch."""
        if not texts:
            return []
            
        if self.model is None:
            self.load_model()

        embeddings = await asyncio.to_thread(self.model.encode, texts)
        return embeddings.tolist()

    async def embed_query(self, query: str) -> List[float]:
        """Compute query embedding vector."""
        return await self.embed_text(query)

embedding_service = EmbeddingService()
