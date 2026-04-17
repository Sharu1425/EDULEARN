"""
Credits API Router
Endpoints for managing the virtual credits/currency system.
"""
from fastapi import APIRouter, Depends, HTTPException, Query, status
from typing import Optional
from pydantic import BaseModel

from ..dependencies import get_current_user, require_admin
from ..models.models import UserModel
from ..services import credits_service

router = APIRouter()


# ── Request/Response Schemas ──────────────────────────────────────────────────

class BalanceResponse(BaseModel):
    user_id: str
    balance: int

class TransactionHistoryResponse(BaseModel):
    transactions: list
    total: int
    limit: int
    skip: int

class AdminCreditRequest(BaseModel):
    user_id: str
    amount: int
    reason: str

class AdminCreditResponse(BaseModel):
    user_id: str
    balance: int
    transaction_id: str


# ── Student / User Endpoints ─────────────────────────────────────────────────

@router.get("/balance", response_model=BalanceResponse, summary="Get my credits balance")
async def get_my_balance(current_user: UserModel = Depends(get_current_user)):
    """Returns the authenticated user's current credits balance."""
    balance = await credits_service.get_balance(str(current_user.id))
    return BalanceResponse(user_id=str(current_user.id), balance=balance)


@router.get("/history", response_model=TransactionHistoryResponse, summary="Get my transaction history")
async def get_my_history(
    limit: int = Query(20, ge=1, le=100),
    skip: int = Query(0, ge=0),
    current_user: UserModel = Depends(get_current_user)
):
    """Returns the authenticated user's paginated credits transaction history."""
    return await credits_service.get_transaction_history(str(current_user.id), limit=limit, skip=skip)


# ── Admin Endpoints ───────────────────────────────────────────────────────────

@router.post("/admin/add", response_model=AdminCreditResponse, summary="[Admin] Add credits to a user")
async def admin_add_credits(
    body: AdminCreditRequest,
    current_user: UserModel = Depends(require_admin)
):
    """Admin: Add credits to any user's balance. Logged as an admin grant."""
    result = await credits_service.add_credits(body.user_id, body.amount, reason=body.reason)
    return AdminCreditResponse(user_id=body.user_id, balance=result["balance"], transaction_id=result["transaction_id"])


@router.post("/admin/deduct", response_model=AdminCreditResponse, summary="[Admin] Deduct credits from a user")
async def admin_deduct_credits(
    body: AdminCreditRequest,
    current_user: UserModel = Depends(require_admin)
):
    """Admin: Deduct credits from any user's balance. Returns 402 if insufficient."""
    result = await credits_service.deduct_credits(body.user_id, body.amount, reason=body.reason)
    return AdminCreditResponse(user_id=body.user_id, balance=result["balance"], transaction_id=result["transaction_id"])
