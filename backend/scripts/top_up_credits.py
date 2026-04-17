import asyncio
import sys
import os
from bson import ObjectId

# Add app to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

async def top_up():
    from app.db.session import init_db, get_db
    from app.services import credits_service
    
    await init_db()
    db = await get_db()
    
    print("[MIGRATION] Starting credit top-up for existing students...")
    
    # Find active students who have 0 or 100 credits
    # The user asked specifically to top up those with 0 or 100 to 200.
    query = {
        "role": "student",
        "credits": {"$in": [0, 100, None]} # Include None just in case some don't have the field
    }
    
    students = await db.users.find(query).to_list(length=None)
    
    if not students:
        print("[MIGRATION] No students found needing top-up.")
        return

    print(f"[MIGRATION] Found {len(students)} students to top-up.")
    
    count = 0
    for student in students:
        user_id = str(student["_id"])
        current_credits = student.get("credits", 0)
        top_up_amount = 200 - current_credits
        
        if top_up_amount > 0:
            try:
                await credits_service.add_credits(user_id, top_up_amount, "legacy_default_topup_to_200")
                count += 1
            except Exception as e:
                print(f"[MIGRATION] Failed to top up user {user_id}: {e}")
                
    print(f"[MIGRATION] Completed. Topped up {count} students.")

if __name__ == "__main__":
    asyncio.run(top_up())
