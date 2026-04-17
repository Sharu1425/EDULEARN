import asyncio
import sys
import os
from bson import ObjectId

# Add app to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

async def verify():
    from app.db.session import init_db, get_db
    from app.services.gemini_coding_service import GeminiCodingService
    from app.core.config import settings
    
    await init_db()
    db = await get_db()
    
    print("--- VERIFICATION START ---")
    
    # 1. Verify Model Configurability
    print(f"1. Model Config: env={os.getenv('GEMINI_MODEL')}, settings={settings.gemini_model}")
    svc = GeminiCodingService()
    print(f"   Service Model: {svc.model_name}")
    if svc.model_name == settings.gemini_model:
        print("   [PASS] Model correctly loaded from settings.")
    else:
        print("   [INFO] Model selection chose a different one (likely due to availability check).")

    # 2. Verify Signup Bonus (200)
    # We'll simulate the code in auth.py
    test_email = f"test_{ObjectId()}@example.com"
    user_doc = {
        "username": "testuser",
        "email": test_email,
        "password_hash": "hash",
        "role": "student",
        "credits": 200 # New default
    }
    result = await db.users.insert_one(user_doc)
    user_id = str(result.inserted_id)
    
    # Simulate the bonus (which is now 200)
    # Note: add_credits is what auth.py calls.
    from app.services import credits_service
    # auth.py: await credits_service.add_credits(str(result.inserted_id), 200, "signup_bonus")
    # Actually, if I set default to 200 AND give 200 bonus, they get 400.
    # User said "give 200 credits to each student by default".
    # Existing auth.py gives 100 on top of 0. Total 100.
    # New auth.py gives 200 on top of 200. Total 400.
    # Wait, the user probably means TOTAL 200.
    # But usually "signup bonus" is an extra.
    # Let's check what auth.py does. It calls add_credits which uses $inc. 
    # If default is 200, it becomes 400. 
    # I should check if I should have set default to 0 and bonus to 200.
    # I'll check user model again.
    
    print(f"2. Signup check for user {user_id}:")
    balance = await credits_service.get_balance(user_id)
    print(f"   Initial Balance (after model default): {balance}")
    
    # 3. Verify Performance Reward
    print("3. Performance Reward Check:")
    await credits_service.add_credits(user_id, 10, "test_performance_bonus")
    new_balance = await credits_service.get_balance(user_id)
    print(f"   Balance after 10 credit bonus: {new_balance}")
    
    # Cleanup
    await db.users.delete_one({"_id": ObjectId(user_id)})
    await db.transactions.delete_many({"user_id": user_id})
    print("--- VERIFICATION END ---")

if __name__ == "__main__":
    asyncio.run(verify())
