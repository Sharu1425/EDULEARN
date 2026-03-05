import asyncio
import traceback
from app.core.config import settings
from app.services.gemini_coding_service import GeminiCodingService

async def test_generation():
    print(f"Loaded Key: {settings.gemini_api_key[:10]}...")
    service = GeminiCodingService()
    print("Available?", service.available)
    print(f"Service Key: {service.api_key[:10]}...")
    try:
        res = await service.generate_mcq_questions("Python", "easy", 2, store_in_db=False)
        print("Generated MCQs:", len(res))
    except Exception as e:
        print("Exception type:", type(e).__name__)
        print("Traceback:")
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_generation())
