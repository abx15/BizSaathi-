import json
import structlog
from typing import List, Dict, Any, AsyncGenerator
from groq import AsyncGroq
from app.config import settings

logger = structlog.get_logger(__name__)

SYSTEM_PROMPT = """
You are BizSaathi AI, a helpful, experienced business advisor for Indian small businesses.
You help with invoicing, expenses, staff management, and CRM.
Always respond in the same language the user writes in (Hindi, English, or Hinglish).
Keep answers concise, practical, and use INR (₹) for amounts.
Use Indian number format: Lakh, Crore (not Million, Billion).
Never make up numbers — only use the data provided in context.
If data is not available or incomplete, say "Yeh data abhi available nahi hai." or "Aapke data mein yeh jaankari nahi mili."
"""

class LLMService:
    def __init__(self):
        self.client = None

    def get_client(self) -> AsyncGroq:
        if self.client is None:
            self.client = AsyncGroq(api_key=settings.GROQ_API_KEY)
        return self.client

    async def chat(self, messages: List[Dict[str, str]], context: str = "") -> str:
        """Non-streaming chat response."""
        try:
            client = self.get_client()
            
            # Incorporate context into system or assistant/user prompt
            system_msg = SYSTEM_PROMPT
            if context:
                system_msg += f"\n\nContext to use:\n{context}"

            formatted_messages = [{"role": "system", "content": system_msg}] + messages

            response = await client.chat.completions.create(
                model=settings.LLM_MODEL,
                messages=formatted_messages,
                temperature=settings.LLM_TEMPERATURE,
                max_tokens=settings.LLM_MAX_TOKENS
            )
            return response.choices[0].message.content
        except Exception as e:
            logger.error("Groq chat error", error=str(e))
            return "Sorry, I am facing technical issues connecting to my AI processor. Please try again shortly."

    async def stream(self, messages: List[Dict[str, str]], context: str = "") -> AsyncGenerator[str, None]:
        """Streaming chat response yielding text chunks."""
        try:
            client = self.get_client()
            system_msg = SYSTEM_PROMPT
            if context:
                system_msg += f"\n\nContext to use:\n{context}"

            formatted_messages = [{"role": "system", "content": system_msg}] + messages

            stream_res = await client.chat.completions.create(
                model=settings.LLM_MODEL,
                messages=formatted_messages,
                temperature=settings.LLM_TEMPERATURE,
                max_tokens=settings.LLM_MAX_TOKENS,
                stream=True
            )
            async for chunk in stream_res:
                delta = chunk.choices[0].delta.content
                if delta:
                    yield delta
        except Exception as e:
            logger.error("Groq stream error", error=str(e))
            yield "Sorry, error streaming answer from AI."

    async def structured_output(self, prompt: str, output_schema: Dict[str, Any]) -> Dict[str, Any]:
        """Forces Groq LLM to return valid JSON matching a specific schema."""
        try:
            client = self.get_client()
            
            # Instruct LLM explicitly
            full_prompt = (
                f"{prompt}\n\n"
                f"You MUST respond ONLY with a raw, valid JSON object matching the JSON schema below. "
                f"Do not include any explanation, backticks, or markdown tags (e.g. no ```json). Just the raw JSON.\n\n"
                f"JSON Schema:\n{json.dumps(output_schema, indent=2)}"
            )

            response = await client.chat.completions.create(
                model=settings.LLM_MODEL,
                messages=[
                    {"role": "system", "content": "You are a precise JSON extractor. Respond only in raw valid JSON. No Markdown block wrapping. No introduction or trailing text."},
                    {"role": "user", "content": full_prompt}
                ],
                temperature=0.1,  # Lower temperature for deterministic outputs
                response_format={"type": "json_object"}
            )
            
            content = response.choices[0].message.content.strip()
            # Clean possible markdown block wraps if model ignored instructions
            if content.startswith("```"):
                content = content.split("\n", 1)[1]
            if content.endswith("```"):
                content = content.rsplit("\n", 1)[0]
                
            return json.loads(content)
        except Exception as e:
            logger.error("Groq structured output error", error=str(e))
            # Return empty/default dict based on keys in schema to prevent hard crash
            return {"error": "Failed to generate structured report", "details": str(e)}

llm_service = LLMService()
