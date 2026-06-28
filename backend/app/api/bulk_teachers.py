from datetime import timezone
"""
Bulk Teacher Management API
Allows admins to bulk-create teacher accounts via Excel upload
"""

import io
from datetime import datetime
from typing import Any, Dict, List, Optional

import pandas as pd
from bson import ObjectId
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import JSONResponse
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel, EmailStr, validator

from app.dependencies import get_db, require_admin
from app.models.models import UserModel
from app.utils.auth_utils import get_password_hash

router = APIRouter()


class TeacherData(BaseModel):
    name: str
    email: EmailStr
    teacher_id: str

    @validator("name")
    def validate_name(cls, v: str) -> str:
        if not v or len(v.strip()) < 2:
            raise ValueError("Name must be at least 2 characters long")
        return v.strip()

    @validator("teacher_id")
    def validate_teacher_id(cls, v: str) -> str:
        if not v or len(v.strip()) < 2:
            raise ValueError("Teacher ID must be provided")
        return v.strip().upper()


class BulkTeacherUploadResponse(BaseModel):
    success: bool
    total_rows: int
    successful_imports: int
    failed_imports: int
    errors: List[Dict[str, Any]]
    created_teachers: List[Dict[str, str]]


async def _validate_excel(file: UploadFile) -> pd.DataFrame:
    if not file.filename.lower().endswith((".xlsx", ".xls", ".csv")):
        raise HTTPException(status_code=400, detail="Only Excel/CSV files are allowed")

    content = await file.read()
    try:
        if file.filename.lower().endswith(".csv"):
            df = pd.read_csv(io.BytesIO(content))
        else:
            df = pd.read_excel(io.BytesIO(content), engine="openpyxl")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error reading file: {str(e)}")

    required = ["name", "email", "teacher_id"]
    missing = [c for c in required if c not in df.columns]
    if missing:
        raise HTTPException(
            status_code=400,
            detail=f"Missing required columns: {', '.join(missing)}. Required: {', '.join(required)}",
        )

    df = df.dropna(subset=["name", "email", "teacher_id"])
    if df.empty:
        raise HTTPException(status_code=400, detail="No valid rows found")
    return df


async def _validate_rows(df: pd.DataFrame) -> (List[Dict[str, Any]], List[Dict[str, Any]]):
    valid: List[Dict[str, Any]] = []
    errors: List[Dict[str, Any]] = []
    for idx, row in df.iterrows():
        row_no = idx + 2
        row_errors: List[str] = []
        name = str(row["name"]).strip()
        email = str(row["email"]).strip().lower()
        teacher_id = str(row["teacher_id"]).strip().upper()

        if len(name) < 2:
            row_errors.append("Name must be at least 2 characters")
        if "@" not in email:
            row_errors.append("Invalid email format")
        if not teacher_id:
            row_errors.append("Teacher ID required")

        if row_errors:
            errors.append({"row": str(row_no), "data": {"name": name, "email": email, "teacher_id": teacher_id}, "errors": row_errors})
        else:
            valid.append({"row": str(row_no), "name": name, "email": email, "teacher_id": teacher_id})
    return valid, errors


async def _check_existing(db: AsyncIOMotorDatabase, teachers: List[Dict[str, Any]]):
    emails = [t["email"] for t in teachers]
    ids = [t["teacher_id"] for t in teachers]
    existing_emails = await db.users.find({"email": {"$in": emails}, "role": "teacher"}).to_list(length=None)
    existing_ids = await db.users.find({"teacher_id": {"$in": ids}, "role": "teacher"}).to_list(length=None)
    return {"emails": {u["email"] for u in existing_emails}, "teacher_ids": {u.get("teacher_id") for u in existing_ids}}


async def _create_teachers(db: AsyncIOMotorDatabase, teachers: List[Dict[str, Any]], existing) -> (List[Dict[str, Any]], List[Dict[str, Any]]):
    created: List[Dict[str, Any]] = []
    errors: List[Dict[str, Any]] = []
    for t in teachers:
        try:
            if t["email"] in existing["emails"]:
                errors.append({"row": str(t["row"]), "email": t["email"], "error": "Email already exists"})
                continue
            if t["teacher_id"] in existing["teacher_ids"]:
                errors.append({"row": str(t["row"]), "teacher_id": t["teacher_id"], "error": "Teacher ID already exists"})
                continue

            password_hash = get_password_hash(t["teacher_id"])  # teacher_id as password
            doc = {
                "username": t["email"],
                "email": t["email"],
                "password_hash": password_hash,
                "role": "teacher",
                "teacher_id": t["teacher_id"],
                "full_name": t["name"],
                "is_active": True,
                "created_at": datetime.now(timezone.utc),
                "last_login": None,
                "profile_completed": False,
                "created_by": "bulk_upload_admin",
                "login_method": "teacher_id",
            }
            res = await db.users.insert_one(doc)
            created.append({"id": str(res.inserted_id), "name": t["name"], "email": t["email"], "teacher_id": t["teacher_id"], "row": str(t["row"])})
        except Exception as e:
            errors.append({"row": str(t["row"]), "data": t, "error": f"Creation failed: {str(e)}"})
    return created, errors


@router.post("/upload", response_model=BulkTeacherUploadResponse)
async def bulk_upload_teachers(
    file: UploadFile = File(...),
    current_user: UserModel = Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    df = await _validate_excel(file)
    valid, validation_errors = await _validate_rows(df)
    if not valid:
        return BulkTeacherUploadResponse(
            success=False,
            total_rows=len(df),
            successful_imports=0,
            failed_imports=len(validation_errors),
            errors=validation_errors,
            created_teachers=[],
        )

    existing = await _check_existing(db, valid)
    created, creation_errors = await _create_teachers(db, valid, existing)
    all_errors = validation_errors + creation_errors

    # Save history
    await db.bulk_teacher_uploads.insert_one(
        {
            "uploaded_by": str(current_user.id),
            "uploaded_at": datetime.now(timezone.utc),
            "file_name": file.filename,
            "total_rows": len(df),
            "successful_imports": len(created),
            "failed_imports": len(all_errors),
            "created_teachers": created,
            "errors": all_errors,
        }
    )

    return BulkTeacherUploadResponse(
        success=len(created) > 0,
        total_rows=len(df),
        successful_imports=len(created),
        failed_imports=len(all_errors),
        errors=all_errors,
        created_teachers=created,
    )


@router.get("/template")
async def bulk_teachers_template():
    sample = {
        "name": ["Alice Johnson", "Bob Smith", "Carol Lee"],
        "email": ["alice@example.com", "bob@example.com", "carol@example.com"],
        "teacher_id": ["TCH1001", "TCH1002", "TCH1003"],
    }
    return JSONResponse(content={"success": True, "template_data": sample})


@router.post("/validate")
async def validate_teachers_file(file: UploadFile = File(...), current_user: UserModel = Depends(require_admin)):
    df = await _validate_excel(file)
    valid, errors = await _validate_rows(df)
    return {
        "success": True,
        "total_rows": len(df),
        "valid_rows": len(valid),
        "invalid_rows": len(errors),
        "preview_data": valid[:10],
        "errors": errors,
        "message": f"Validation complete: {len(valid)} valid rows",
    }


@router.get("/history")
async def bulk_teachers_history(current_user: UserModel = Depends(require_admin), db: AsyncIOMotorDatabase = Depends(get_db)):
    uploads = await db.bulk_teacher_uploads.find({}).sort("uploaded_at", -1).to_list(length=None)
    return {"success": True, "uploads": uploads}


