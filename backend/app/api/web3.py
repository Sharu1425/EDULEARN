from fastapi import APIRouter, HTTPException, Depends
import uuid
from datetime import datetime
from pydantic import BaseModel
from typing import List, Optional

from ..db import get_db
from ..utils.auth_utils import create_access_token
from .auth import get_current_user_id

router = APIRouter()

class Web3LoginReq(BaseModel):
    wallet_address: str

class TransferReq(BaseModel):
    to_address: str
    amount: float

@router.post("/connect")
async def web3_connect(req: Web3LoginReq):
    """
    Simulates a Web3 Wallet connection.
    If the wallet address is new, registers them with 1000 starting credits.
    Returns standard JWT for our platform.
    """
    db = await get_db()
    wallet_address = req.wallet_address

    user = await db.users.find_one({"wallet_address": wallet_address})

    if not user:
        # Create brand new Web3 user with 1000 initial credits
        print(f"[WEB3] New wallet connected. Minting 1000 credits to {wallet_address}")
        user_doc = {
            "username": f"Web3_{wallet_address[-6:]}",
            "email": f"{wallet_address}@ledger.local",
            "password_hash": "WEB3_AUTH",
            "is_admin": False,
            "role": "student",
            "wallet_address": wallet_address,
            "credits": 1000.0,
            "created_at": datetime.utcnow()
        }
        result = await db.users.insert_one(user_doc)
        user_doc["_id"] = result.inserted_id
        user = user_doc

    # Generate Standard Platform JWT
    access_token = create_access_token(
        data={
            "sub": str(user["_id"]), 
            "email": user["email"],
            "role": user.get("role", "student"),
            "wallet_address": wallet_address
        }
    )

    return {
        "success": True,
        "message": "Web3 Wallet Connected successfully",
        "access_token": access_token,
        "user": {
            "id": str(user["_id"]),
            "username": user.get("username"),
            "role": user.get("role", "student"),
            "wallet_address": wallet_address,
            "credits": user.get("credits", 1000.0)
        }
    }


@router.post("/transfer")
async def transfer_credits(req: TransferReq, user_id: str = Depends(get_current_user_id)):
    """
    Transfer credits from the logged-in user to another Web3 wallet address.
    """
    if req.amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be positive")

    db = await get_db()
    from bson import ObjectId
    
    sender = await db.users.find_one({"_id": ObjectId(user_id)})
    if not sender:
        raise HTTPException(status_code=404, detail="Sender not found")

    sender_wallet = sender.get("wallet_address")
    if not sender_wallet:
        raise HTTPException(status_code=400, detail="Sender does not have a Web3 wallet connected")

    if sender.get("credits", 0) < req.amount:
        raise HTTPException(status_code=400, detail="Insufficient credits")

    receiver = await db.users.find_one({"wallet_address": req.to_address})
    if not receiver:
        raise HTTPException(status_code=404, detail="Receiver wallet address not found")

    # Perform custom ledger logic (deduct sender, add receiver)
    await db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$inc": {"credits": -req.amount}}
    )
    
    await db.users.update_one(
        {"wallet_address": req.to_address},
        {"$inc": {"credits": req.amount}}
    )

    # Generate Cryptographic-looking Hash for the Transaction
    tx_hash = "0x" + uuid.uuid4().hex

    # Save Transaction Receipt in Ledger
    tx_doc = {
        "tx_hash": tx_hash,
        "from_address": sender_wallet,
        "to_address": req.to_address,
        "amount": req.amount,
        "timestamp": datetime.utcnow(),
        "status": "SUCCESS"
    }
    await db.transactions.insert_one(tx_doc)

    print(f"[LEDGER] Sent {req.amount} from {sender_wallet} to {req.to_address} | TX: {tx_hash}")

    return {
        "success": True,
        "tx_hash": tx_hash,
        "message": f"Successfully transferred {req.amount} credits!"
    }


@router.get("/transactions")
async def get_transactions(user_id: str = Depends(get_current_user_id)):
    """
    Get ledger history for the logged-in user.
    """
    db = await get_db()
    from bson import ObjectId
    
    user = await db.users.find_one({"_id": ObjectId(user_id)})
    if not user or not user.get("wallet_address"):
        return {"success": True, "transactions": []}

    wallet_address = user["wallet_address"]
    
    # Get all transactions where user is sender or receiver
    cursor = db.transactions.find({
        "$or": [
            {"from_address": wallet_address},
            {"to_address": wallet_address}
        ]
    }).sort("timestamp", -1)
    
    transactions = await cursor.to_list(length=100)
    
    # Format for JSON response
    for tx in transactions:
        tx["_id"] = str(tx["_id"])
        if "timestamp" in tx and tx["timestamp"]:
            tx["timestamp"] = tx["timestamp"].isoformat()
            
    return {
        "success": True,
        "wallet_address": wallet_address,
        "balance": user.get("credits", 0.0),
        "transactions": transactions
    }
