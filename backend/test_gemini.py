import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services.mastery_service import mastery_service

async def main():
    try:
        print("calling gemini generate_roadmap...")
        topics = await mastery_service.generate_roadmap("Python")
        print(f"Success! topics count: {len(topics)}")
        print(topics[0])
    except Exception as e:
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main())
