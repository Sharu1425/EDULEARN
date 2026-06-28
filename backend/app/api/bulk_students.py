from datetime import timezone
"""
Bulk Student Management API
Handles bulk student addition via Excel file upload
"""

import pandas as pd
import io
import hashlib
from typing import List, Dict, Any, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import JSONResponse
from pydantic import BaseModel, EmailStr, validator
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.security import SecurityManager
from app.utils.auth_utils import get_password_hash, verify_password
from app.dependencies import get_db, get_current_user, require_teacher_or_admin
from app.models.models import UserModel

router = APIRouter()

# Pydantic models for validation
class StudentData(BaseModel):
    name: str
    roll_number: str
    email: EmailStr
    
    @validator('name')
    def validate_name(cls, v):
        if not v or len(v.strip()) < 2:
            raise ValueError('Name must be at least 2 characters long')
        return v.strip()
    
    @validator('roll_number')
    def validate_roll_number(cls, v):
        if not v or len(v.strip()) < 1:
            raise ValueError('Roll number cannot be empty')
        return v.strip().upper()

class BulkUploadResponse(BaseModel):
    success: bool
    total_rows: int
    successful_imports: int
    updated_count: int = 0
    failed_imports: int
    errors: List[Dict[str, Any]]
    created_students: List[Dict[str, str]]
    updated_students: List[Dict[str, str]] = []
    batch_id: Optional[str] = None

class BulkUploadRequest(BaseModel):
    batch_id: str
    send_welcome_emails: bool = True

async def validate_excel_file(file: UploadFile) -> pd.DataFrame:
    """Validate and parse Excel file"""
    try:
        # Check file extension
        if not file.filename.lower().endswith(('.xlsx', '.xls')):
            raise HTTPException(
                status_code=400, 
                detail="Only Excel files (.xlsx, .xls) are allowed"
            )
        
        # Read file content
        content = await file.read()
        
        # Parse Excel file
        try:
            df = pd.read_excel(io.BytesIO(content), engine='openpyxl')
        except Exception as e:
            raise HTTPException(
                status_code=400,
                detail=f"Error reading Excel file: {str(e)}"
            )
        
        # Validate required columns
        required_columns = ['name', 'roll_number', 'email']
        missing_columns = [col for col in required_columns if col not in df.columns]
        
        if missing_columns:
            raise HTTPException(
                status_code=400,
                detail=f"Missing required columns: {', '.join(missing_columns)}. Required columns are: {', '.join(required_columns)}"
            )
        
        # Remove empty rows
        df = df.dropna(subset=['name', 'roll_number', 'email'])
        
        if df.empty:
            raise HTTPException(
                status_code=400,
                detail="No valid data found in the Excel file"
            )
        
        return df
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error processing Excel file: {str(e)}"
        )

async def validate_student_data(df: pd.DataFrame) -> List[Dict[str, Any]]:
    """Validate student data and return list of valid/invalid records"""
    validated_data = []
    errors = []
    
    for index, row in df.iterrows():
        row_errors = []
        
        try:
            # Validate name
            name = str(row['name']).strip()
            if not name or len(name) < 2:
                row_errors.append("Name must be at least 2 characters long")
            
            # Validate roll number
            roll_number = str(row['roll_number']).strip().upper()
            if not roll_number:
                row_errors.append("Roll number cannot be empty")
            
            # Validate email
            email = str(row['email']).strip().lower()
            if not email or '@' not in email:
                row_errors.append("Invalid email format")
            
            if row_errors:
                errors.append({
                    "row": str(index + 2),  # +2 because Excel is 1-indexed and we skip header
                    "data": {
                        "name": name,
                        "roll_number": roll_number,
                        "email": email
                    },
                    "errors": row_errors
                })
            else:
                validated_data.append({
                    "name": name,
                    "roll_number": roll_number,
                    "email": email,
                    "row": str(index + 2)
                })
                
        except Exception as e:
            errors.append({
                "row": str(index + 2),
                "data": dict(row),
                "errors": [f"Data validation error: {str(e)}"]
            })
    
    return validated_data, errors

async def check_existing_students(db: AsyncIOMotorDatabase, students_data: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Check for existing students by email or roll number"""
    emails = [student['email'] for student in students_data]
    roll_numbers = [student['roll_number'] for student in students_data]
    
    # Check existing emails
    existing_emails = await db.users.find({
        "email": {"$in": emails},
        "role": "student"
    }).to_list(length=None)
    
    # Check existing roll numbers
    existing_rolls = await db.users.find({
        "roll_number": {"$in": roll_numbers},
        "role": "student"
    }).to_list(length=None)
    
    existing_email_set = {user['email'] for user in existing_emails}
    existing_roll_set = {user['roll_number'] for user in existing_rolls}
    
    return {
        "existing_emails": existing_email_set,
        "existing_rolls": existing_roll_set
    }

async def create_student_accounts(
    db: AsyncIOMotorDatabase, 
    students_data: List[Dict[str, Any]], 
    batch_id: str,
    existing_data: Dict[str, Any]
) -> List[Dict[str, Any]]:
    """Create student accounts and return results"""
    created_students = []
    updated_students = []
    errors = []
    
    for student in students_data:
        try:
            # Check if student already exists
            if student['email'] in existing_data['existing_emails']:
                # Student exists - add them to the new batch instead of error
                existing_student = await db.users.find_one({"email": student['email']})
                if existing_student:
                    student_id = str(existing_student["_id"])
                    
                    # Add batch to student's batch_ids (multi-batch support)
                    result = await db.users.update_one(
                        {"_id": existing_student["_id"]},
                        {"$addToSet": {"batch_ids": batch_id}}
                    )
                    
                    # Add student to batch's student_ids
                    await db.batches.update_one(
                        {"_id": ObjectId(batch_id)},
                        {"$addToSet": {"student_ids": student_id}}
                    )
                    
                    if result.modified_count > 0:
                        updated_students.append({
                            "id": student_id,
                            "name": student['name'],
                            "email": student['email'],
                            "row": str(student['row']),
                            "status": "Added to new batch"
                        })
                    else:
                        updated_students.append({
                            "id": student_id,
                            "name": student['name'],
                            "email": student['email'],
                            "row": str(student['row']),
                            "status": "Already in this batch"
                        })
                continue
            
            if student['roll_number'] in existing_data['existing_rolls']:
                errors.append({
                    "row": str(student['row']),
                    "roll_number": student['roll_number'],
                    "error": "Roll number already exists"
                })
                continue
            
            # Create password hash from roll number
            password_hash = get_password_hash(student['roll_number'])
            
            # Create student document (using batch_ids array for multi-batch support)
            student_doc = {
                "username": student['email'],  # Use email as username
                "email": student['email'],
                "password_hash": password_hash,
                "role": "student",
                "batch_ids": [batch_id],  # Multi-batch support: use array
                "roll_number": student['roll_number'],
                "full_name": student['name'],
                "is_active": True,
                "created_at": datetime.now(timezone.utc),
                "last_login": None,
                "profile_completed": False,
                "created_by": "bulk_upload",
                "login_method": "roll_number"
            }
            
            # Insert student
            result = await db.users.insert_one(student_doc)
            student_id = str(result.inserted_id)
            
            # Add student to batch's student_ids array
            await db.batches.update_one(
                {"_id": ObjectId(batch_id)},
                {"$addToSet": {"student_ids": student_id}}
            )
            
            created_students.append({
                "id": str(result.inserted_id),
                "name": student['name'],
                "roll_number": student['roll_number'],
                "email": student['email'],
                "row": str(student['row'])
            })
            
        except Exception as e:
            errors.append({
                "row": str(student['row']),
                "data": student,
                "error": f"Account creation failed: {str(e)}"
            })
    
    return created_students, updated_students, errors

@router.post("/upload", response_model=BulkUploadResponse)
async def bulk_upload_students(
    file: UploadFile = File(...),
    batch_id: str = Form(...),
    send_welcome_emails: bool = Form(True),
    current_user: UserModel = Depends(require_teacher_or_admin),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Upload Excel file and create student accounts in bulk"""
    try:
        print(f"📊 [BULK_UPLOAD] Starting bulk upload for batch {batch_id} by user {current_user.id}")
        
        # Validate batch exists
        batch = await db.batches.find_one({"_id": ObjectId(batch_id)})
        if not batch:
            raise HTTPException(status_code=404, detail="Batch not found")
        
        # Validate Excel file
        df = await validate_excel_file(file)
        print(f"📊 [BULK_UPLOAD] Excel file validated, {len(df)} rows found")
        
        # Validate student data
        students_data, validation_errors = await validate_student_data(df)
        print(f"📊 [BULK_UPLOAD] Data validation complete: {len(students_data)} valid, {len(validation_errors)} errors")
        
        if not students_data:
            return BulkUploadResponse(
                success=False,
                total_rows=len(df),
                successful_imports=0,
                failed_imports=len(validation_errors),
                errors=validation_errors,
                created_students=[],
                batch_id=batch_id
            )
        
        # Check for existing students
        existing_data = await check_existing_students(db, students_data)
        print(f"📊 [BULK_UPLOAD] Found {len(existing_data['existing_emails'])} existing emails, {len(existing_data['existing_rolls'])} existing roll numbers")
        
        # Create student accounts
        created_students, updated_students, creation_errors = await create_student_accounts(
            db, students_data, batch_id, existing_data
        )
        
        # Combine all errors
        all_errors = validation_errors + creation_errors
        
        # Update batch student count
        if created_students or updated_students:
            await db.batches.update_one(
                {"_id": ObjectId(batch_id)},
                {"$inc": {"student_count": len(created_students)}}
            )
        
        # Create bulk upload record for tracking
        bulk_record = {
            "batch_id": batch_id,
            "uploaded_by": current_user.id,
            "uploaded_at": datetime.now(timezone.utc),
            "total_rows": len(df),
            "successful_imports": len(created_students),
            "updated_imports": len(updated_students),
            "failed_imports": len(all_errors),
            "file_name": file.filename,
            "created_students": created_students,
            "updated_students": updated_students,
            "errors": all_errors
        }
        await db.bulk_uploads.insert_one(bulk_record)
        
        print(f"✅ [BULK_UPLOAD] Completed: {len(created_students)} created, {len(updated_students)} updated, {len(all_errors)} errors")
        
        return BulkUploadResponse(
            success=(len(created_students) + len(updated_students)) > 0,
            total_rows=len(df),
            successful_imports=len(created_students),
            updated_count=len(updated_students),
            failed_imports=len(all_errors),
            errors=all_errors,
            created_students=created_students,
            updated_students=updated_students,
            batch_id=batch_id
        )
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ [BULK_UPLOAD] Error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Bulk upload failed: {str(e)}"
        )

@router.get("/template")
async def download_template():
    """Download Excel template for bulk student upload"""
    try:
        # Create template DataFrame
        template_data = {
            'name': ['John Doe', 'Jane Smith', 'Mike Johnson'],
            'roll_number': ['2024001', '2024002', '2024003'],
            'email': ['john.doe@example.com', 'jane.smith@example.com', 'mike.johnson@example.com']
        }
        
        df = pd.DataFrame(template_data)
        
        # Create Excel file in memory
        output = io.BytesIO()
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            df.to_excel(writer, sheet_name='Students', index=False)
        
        output.seek(0)
        
        return JSONResponse(
            content={
                "success": True,
                "message": "Template created successfully",
                "template_data": template_data
            }
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to create template: {str(e)}"
        )

@router.get("/history/{batch_id}")
async def get_upload_history(
    batch_id: str,
    current_user: UserModel = Depends(require_teacher_or_admin),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get bulk upload history for a batch"""
    try:
        uploads = await db.bulk_uploads.find({
            "batch_id": batch_id
        }).sort("uploaded_at", -1).to_list(length=None)
        
        return {
            "success": True,
            "uploads": uploads
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get upload history: {str(e)}"
        )

@router.post("/validate")
async def validate_excel_preview(
    file: UploadFile = File(...),
    current_user: UserModel = Depends(require_teacher_or_admin)
):
    """Preview and validate Excel file without creating accounts"""
    try:
        # Validate Excel file
        df = await validate_excel_file(file)
        
        # Validate student data
        students_data, validation_errors = await validate_student_data(df)
        
        return {
            "success": True,
            "total_rows": len(df),
            "valid_rows": len(students_data),
            "invalid_rows": len(validation_errors),
            "preview_data": students_data[:10],  # Show first 10 rows
            "errors": validation_errors,
            "message": f"File validation complete. {len(students_data)} valid records found."
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Validation failed: {str(e)}"
        )
