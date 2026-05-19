from qdrant_client import AsyncQdrantClient
from qdrant_client.http import models
from qdrant_client.http.exceptions import UnexpectedResponse
import structlog
from typing import Optional, List, Dict, Any
from app.config import settings

logger = structlog.get_logger(__name__)

class VectorStore:
    def __init__(self):
        self.client: Optional[AsyncQdrantClient] = None

    async def connect(self):
        if self.client is None:
            try:
                self.client = AsyncQdrantClient(url=settings.QDRANT_URL)
                logger.info("Connected to Qdrant successfully")
                await self.init_collections()
            except Exception as e:
                logger.error("Failed to connect to Qdrant", error=str(e))
                raise e

    async def init_collections(self):
        """Create Qdrant collections on startup if they don't exist."""
        if self.client is None:
            raise RuntimeError("Qdrant client is not connected")

        collections = [
            settings.QDRANT_COLLECTION_BUSINESS,
            settings.QDRANT_COLLECTION_INSIGHTS
        ]

        for col in collections:
            try:
                # Check if collection exists
                await self.client.get_collection(collection_name=col)
                logger.info("Qdrant collection already exists", collection=col)
            except (UnexpectedResponse, Exception):
                logger.info("Creating Qdrant collection", collection=col)
                await self.client.create_collection(
                    collection_name=col,
                    vectors_config=models.VectorParams(
                        size=384,  # all-MiniLM-L6-v2 vector dimension
                        distance=models.Distance.COSINE
                    )
                )
                # Create index on payload fields for efficient filtering
                await self.client.create_payload_index(
                    collection_name=col,
                    field_name="tenant_id",
                    field_schema=models.PayloadSchemaType.KEYWORD
                )
                logger.info("Created collection and index", collection=col)

    async def upsert_documents(self, collection: str, tenant_id: str, documents: List[Dict[str, Any]]) -> bool:
        """
        documents is a list of dicts:
        {
           "id": str (uuid or custom unique ID),
           "vector": List[float],
           "payload": Dict[str, Any] (Must contain tenant_id, text, etc.)
        }
        """
        if self.client is None:
            raise RuntimeError("Qdrant client is not connected")

        try:
            points = []
            for doc in documents:
                payload = doc.get("payload", {})
                # Ensure tenant_id is in payload
                payload["tenant_id"] = tenant_id
                
                points.append(
                    models.PointStruct(
                        id=doc["id"],
                        vector=doc["vector"],
                        payload=payload
                    )
                )

            await self.client.upsert(
                collection_name=collection,
                wait=True,
                points=points
            )
            logger.info("Upserted points into Qdrant", collection=collection, count=len(points))
            return True
        except Exception as e:
            logger.error("Failed to upsert to Qdrant", collection=collection, error=str(e))
            return False

    async def search(self, collection: str, tenant_id: str, query_vector: List[float], limit: int = 5, score_threshold: float = 0.5) -> List[Dict[str, Any]]:
        if self.client is None:
            raise RuntimeError("Qdrant client is not connected")

        try:
            search_result = await self.client.search(
                collection_name=collection,
                query_vector=query_vector,
                query_filter=models.Filter(
                    must=[
                        models.FieldCondition(
                            key="tenant_id",
                            match=models.MatchValue(value=tenant_id)
                        )
                    ]
                ),
                limit=limit,
                score_threshold=score_threshold
            )
            
            results = []
            for hit in search_result:
                results.append({
                    "id": hit.id,
                    "score": hit.score,
                    "payload": hit.payload
                })
            return results
        except Exception as e:
            logger.error("Qdrant search error", collection=collection, error=str(e))
            return []

    async def delete_tenant_data(self, collection: str, tenant_id: str) -> bool:
        if self.client is None:
            raise RuntimeError("Qdrant client is not connected")

        try:
            await self.client.delete(
                collection_name=collection,
                points_selector=models.FilterSelector(
                    filter=models.Filter(
                        must=[
                            models.FieldCondition(
                                key="tenant_id",
                                match=models.MatchValue(value=tenant_id)
                            )
                        ]
                    )
                )
            )
            logger.info("Deleted tenant data in Qdrant", collection=collection, tenant_id=tenant_id)
            return True
        except Exception as e:
            logger.error("Failed to delete tenant data in Qdrant", collection=collection, tenant_id=tenant_id, error=str(e))
            return False

    async def get_collection_stats(self, collection: str, tenant_id: str) -> Dict[str, Any]:
        if self.client is None:
            raise RuntimeError("Qdrant client is not connected")

        try:
            # Check how many items match the tenant filter
            res = await self.client.scroll(
                collection_name=collection,
                scroll_filter=models.Filter(
                    must=[
                        models.FieldCondition(
                            key="tenant_id",
                            match=models.MatchValue(value=tenant_id)
                        )
                    ]
                ),
                limit=1,
                with_payload=False,
                with_vectors=False
            )
            # Just retrieve info
            info = await self.client.get_collection(collection_name=collection)
            return {
                "status": info.status,
                "vectors_count": info.vectors_count,
                "points_count": info.points_count
            }
        except Exception as e:
            logger.error("Failed to get Qdrant collection stats", collection=collection, error=str(e))
            return {}

vector_store = VectorStore()
