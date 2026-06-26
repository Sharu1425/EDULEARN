import asyncio
import os
import sys

# Add backend directory to sys.path to resolve imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.session import init_db, get_db
from app.core.config import settings

async def main():
    try:
        print("Initializing db...")
        await init_db()
        db = await get_db()
        print("db connected.")
        
        roadmap_coll = db.get_collection("mastery_roadmaps")
        docs = await roadmap_coll.find().to_list(length=10)
        print(f"Found {len(docs)} mastery_roadmaps.")
        for d in docs:
            print(d.keys())
            print(f"_id: {d.get('_id')}")
            print(f"id: {d.get('id')}")
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(main())
