import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import certifi

async def test_db():
    try:
        uri = "mongodb+srv://admin:admin@edulearn.d4rpkra.mongodb.net/?appName=edulearn"
        client = AsyncIOMotorClient(uri, tlsCAFile=certifi.where())
        db = client.edulearn
        print("Pinging db...")
        await db.command('ping')
        print("Connected! Testing insert...")
        
        # Test insert
        user_doc = {
            "email": "test@test.com",
            "username": "test",
            "role": "student"
        }
        try:
            res = await db.users.insert_one(user_doc)
            print(f"Inserted: {res.inserted_id}")
            # cleanup
            await db.users.delete_one({"_id": res.inserted_id})
        except Exception as e:
            print(f"Insert failed: {type(e).__name__} - {str(e)}")
            import traceback
            traceback.print_exc()
            
    except Exception as e:
        print(f"Connection failed: {str(e)}")

if __name__ == "__main__":
    asyncio.run(test_db())
