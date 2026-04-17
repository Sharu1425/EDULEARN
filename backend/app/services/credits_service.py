"""
Credits Service — Ledger-based virtual currency system.

Every balance change creates an immutable transaction record.
No direct overwrite: atomicity guaranteed via MongoDB $inc.
"""
from datetime import datetime
from typing import Optional
from fastapi import HTTPException, status
from bson import ObjectId

from ..db import get_db


# ── Core Credits Operations ───────────────────────────────────────────────────

async def get_balance(user_id: str) -> int:
    """Return the current credits balance for a user."""
    db = await get_db()
    user = await db.users.find_one({"_id": ObjectId(user_id)}, {"credits": 1})
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return user.get("credits", 0)


async def add_credits(user_id: str, amount: int, reason: str) -> dict:
    """
    Atomically add credits to a user and log the transaction.
    Returns: {"balance": new_balance, "transaction_id": str}
    """
    if amount <= 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Amount must be positive")

    db = await get_db()

    # Atomically increment and retrieve new balance
    result = await db.users.find_one_and_update(
        {"_id": ObjectId(user_id)},
        {"$inc": {"credits": amount}},
        return_document=True,
        projection={"credits": 1}
    )
    if not result:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    new_balance = result["credits"]

    # Log the transaction
    tx = {
        "user_id": user_id,
        "type": "credit",
        "amount": amount,
        "reason": reason,
        "balance_after": new_balance,
        "created_at": datetime.utcnow(),
    }
    tx_result = await db.transactions.insert_one(tx)
    print(f"[CREDITS] +{amount} for user {user_id} ({reason}) -> balance: {new_balance}")

    return {"balance": new_balance, "transaction_id": str(tx_result.inserted_id)}


async def deduct_credits(user_id: str, amount: int, reason: str) -> dict:
    """
    Atomically deduct credits from a user if they have sufficient balance.
    Raises 402 Payment Required if balance is insufficient.
    Returns: {"balance": new_balance, "transaction_id": str}
    """
    if amount <= 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Amount must be positive")

    db = await get_db()

    # Check current balance first
    user = await db.users.find_one({"_id": ObjectId(user_id)}, {"credits": 1})
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    current_balance = user.get("credits", 0)
    if current_balance < amount:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail=f"Insufficient credits. Balance: {current_balance}, required: {amount}"
        )

    # Atomically decrement
    result = await db.users.find_one_and_update(
        {"_id": ObjectId(user_id), "credits": {"$gte": amount}},  # double-check atomically
        {"$inc": {"credits": -amount}},
        return_document=True,
        projection={"credits": 1}
    )
    if not result:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail="Insufficient credits (concurrent update detected)"
        )

    new_balance = result["credits"]

    # Log the transaction
    tx = {
        "user_id": user_id,
        "type": "debit",
        "amount": amount,
        "reason": reason,
        "balance_after": new_balance,
        "created_at": datetime.utcnow(),
    }
    tx_result = await db.transactions.insert_one(tx)
    print(f"[CREDITS] -{amount} for user {user_id} ({reason}) -> balance: {new_balance}")

    return {"balance": new_balance, "transaction_id": str(tx_result.inserted_id)}


async def get_transaction_history(user_id: str, limit: int = 20, skip: int = 0) -> dict:
    """Return paginated transaction history for a user (newest first)."""
    db = await get_db()

    total = await db.transactions.count_documents({"user_id": user_id})
    cursor = db.transactions.find(
        {"user_id": user_id},
        sort=[("created_at", -1)]
    ).skip(skip).limit(limit)

    transactions = []
    async for tx in cursor:
        tx["_id"] = str(tx["_id"])
        transactions.append(tx)

    return {
        "transactions": transactions,
        "total": total,
        "limit": limit,
        "skip": skip
    }
