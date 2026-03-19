# Database Schema Documentation

## Overview

EDULEARN uses MongoDB as its primary database. This document describes all collections, their schemas, indexes, and relationships.

## Database: `edulearn`

### Collections Overview

| Collection | Purpose | Document Count (Typical) |
|------------|---------|--------------------------|
| users | User accounts and profiles | 1000+ |
| batches | Student groups/classes | 50-100 |
| assessments | Manual assessments | 100-500 |
| teacher_assessments | AI-generated assessments | 100-500 |
| ai_questions | Generated question bank | 1000+ |
| teacher_assessment_results | Student submissions | 5000+ |
| notifications | User notifications | 10000+ |
| coding_problems | Coding challenges | 100-500 |
| coding_submissions | Code submissions | 5000+ |

---

## Collection Schemas

### 1. `users`

**Purpose**: Store all user accounts (students, teachers, admins)

**Schema**:
```javascript
{
  "_id": ObjectId,                    // Primary key
  "email": String,                    // Unique email address
  "username": String,                 // Display name
  "full_name": String,                // Full name
  "password_hash": String,            // Bcrypt hashed password
  "role": String,                     // "student", "teacher", "admin"
  "is_active": Boolean,               // Account status
  "created_at": ISODate,              // Account creation timestamp
  "last_login": ISODate,              // Last login timestamp
  "last_activity": ISODate,           // Last activity timestamp
  
  // Student-specific fields
  "batch_id": ObjectId,               // Reference to batches collection
  "batch_name": String,               // Denormalized batch name
  "level": Number,                    // Gamification level (1-100)
  "xp": Number,                       // Experience points
  "badges": Array<String>,            // Earned badges
  "completed_assessments": Number,    // Count of completed assessments
  "average_score": Number,            // Average score percentage (0-100)
  "streak": Number,                   // Current streak days
  "longest_streak": Number,           // Longest streak achieved
  
  // OAuth fields
  "oauth_provider": String,           // "google", "github", etc.
  "oauth_id": String,                 // Provider user ID
  "profile_picture": String,          // URL to profile picture
  
  // Face recognition
  "face_encoding": Array<Number>,     // Face recognition data
  
  // Metadata
  "preferences": {
    "theme": String,                  // "light" or "dark"
    "notifications": Boolean,         // Email notifications enabled
    "language": String                // Preferred language
  }
}
```

**Indexes**:
```javascript
// Unique indexes
db.users.createIndex({ "email": 1 }, { unique: true })
db.users.createIndex({ "oauth_id": 1, "oauth_provider": 1 }, { unique: true, sparse: true })

// Query indexes
db.users.createIndex({ "role": 1 })
db.users.createIndex({ "batch_id": 1 })
db.users.createIndex({ "is_active": 1 })
db.users.createIndex({ "created_at": -1 })
```

**Example Document**:
```json
{
  "_id": ObjectId("65abc123def456789..."),
  "email": "john.doe@example.com",
  "username": "John Doe",
  "full_name": "John Doe",
  "password_hash": "$2b$12$KIX...",
  "role": "student",
  "is_active": true,
  "created_at": ISODate("2024-01-15T10:30:00Z"),
  "last_login": ISODate("2024-01-20T14:25:00Z"),
  "last_activity": ISODate("2024-01-20T15:45:00Z"),
  "batch_id": ObjectId("65abc456def789012..."),
  "batch_name": "Computer Science 2024 A",
  "level": 15,
  "xp": 3450,
  "badges": ["first_assessment", "code_master", "streak_7"],
  "completed_assessments": 12,
  "average_score": 85.5,
  "streak": 7,
  "longest_streak": 15,
  "preferences": {
    "theme": "dark",
    "notifications": true,
    "language": "en"
  }
}
```

---

### 2. `batches`

**Purpose**: Group students into classes/batches

**Schema**:
```javascript
{
  "_id": ObjectId,                    // Primary key
  "name": String,                     // Batch name
  "description": String,              // Batch description
  "teacher_id": String,               // Reference to user (teacher)
  "created_at": ISODate,              // Creation timestamp
  "updated_at": ISODate,              // Last update timestamp
  "status": String,                   // "active", "archived", "completed"
  "student_ids": Array<String>,       // Array of user IDs (students)
  "metadata": {
    "subject": String,                // Primary subject
    "grade": String,                  // Grade level
    "academic_year": String,          // e.g., "2023-2024"
    "start_date": ISODate,            // Batch start date
    "end_date": ISODate               // Batch end date
  }
}
```

**Indexes**:
```javascript
db.batches.createIndex({ "teacher_id": 1 })
db.batches.createIndex({ "status": 1 })
db.batches.createIndex({ "created_at": -1 })
db.batches.createIndex({ "student_ids": 1 })
```

**Example Document**:
```json
{
  "_id": ObjectId("65abc456def789012..."),
  "name": "Computer Science 2024 A",
  "description": "Advanced Computer Science batch for 2024",
  "teacher_id": "65abc789def012345...",
  "created_at": ISODate("2024-01-01T00:00:00Z"),
  "updated_at": ISODate("2024-01-15T10:30:00Z"),
  "status": "active",
  "student_ids": [
    "65abc123def456789...",
    "65abc234def567890...",
    "65abc345def678901..."
  ],
  "metadata": {
    "subject": "Computer Science",
    "grade": "10th",
    "academic_year": "2023-2024",
    "start_date": ISODate("2024-01-01T00:00:00Z"),
    "end_date": ISODate("2024-06-30T00:00:00Z")
  }
}
```

---

### 3. `teacher_assessments`

**Purpose**: Store AI-generated and teacher-created assessments

**Schema**:
```javascript
{
  "_id": ObjectId,                    // Primary key
  "title": String,                    // Assessment title
  "topic": String,                    // Assessment topic
  "difficulty": String,               // "easy", "medium", "hard"
  "question_count": Number,           // Number of questions
  "type": String,                     // "ai_generated", "mcq", "coding", "challenge"
  "status": String,                   // "draft", "published", "archived"
  "is_active": Boolean,               // Whether assessment is active
  "teacher_id": String,               // Reference to user (teacher)
  "batches": Array<String>,           // Array of batch IDs
  "created_at": ISODate,              // Creation timestamp
  "updated_at": ISODate,              // Last update timestamp
  "published_at": ISODate,            // Publication timestamp
  "time_limit": Number,               // Time limit in minutes
  
  "questions": Array<{
    "question": String,               // Question text
    "options": Array<String>,         // Answer options
    "correct_answer": Number,         // Index of correct answer (0-based)
    "explanation": String,            // Explanation of answer
    "difficulty": String,             // Question difficulty
    "points": Number                  // Points for this question
  }>,
  
  "config": {
    "shuffle_questions": Boolean,     // Randomize question order
    "shuffle_options": Boolean,       // Randomize option order
    "show_results": Boolean,          // Show results after submission
    "allow_review": Boolean,          // Allow answer review
    "max_attempts": Number            // Maximum attempts allowed
  }
}
```

**Indexes**:
```javascript
db.teacher_assessments.createIndex({ "teacher_id": 1 })
db.teacher_assessments.createIndex({ "batches": 1 })
db.teacher_assessments.createIndex({ "status": 1 })
db.teacher_assessments.createIndex({ "is_active": 1 })
db.teacher_assessments.createIndex({ "created_at": -1 })
db.teacher_assessments.createIndex({ "topic": 1 })
db.teacher_assessments.createIndex({ "difficulty": 1 })
```

---

### 4. `ai_questions`

**Purpose**: Store individual AI-generated questions for review

**Schema**:
```javascript
{
  "_id": ObjectId,                    // Primary key
  "assessment_id": String,            // Reference to teacher_assessments
  "question_number": Number,          // Question number in assessment
  "question": String,                 // Question text
  "options": Array<String>,           // Answer options
  "correct_answer": Number,           // Index of correct answer
  "explanation": String,              // Answer explanation
  "difficulty": String,               // "easy", "medium", "hard"
  "topic": String,                    // Question topic
  "generated_at": ISODate,            // Generation timestamp
  "teacher_id": String,               // Reference to user (teacher)
  "status": String,                   // "generated", "approved", "rejected", "modified"
  "tags": Array<String>,              // Question tags
  "metadata": {
    "bloom_level": String,            // Bloom's taxonomy level
    "cognitive_load": String,         // Low, Medium, High
    "estimated_time": Number          // Estimated time in seconds
  }
}
```

**Indexes**:
```javascript
db.ai_questions.createIndex({ "assessment_id": 1 })
db.ai_questions.createIndex({ "teacher_id": 1 })
db.ai_questions.createIndex({ "status": 1 })
db.ai_questions.createIndex({ "topic": 1 })
db.ai_questions.createIndex({ "difficulty": 1 })
db.ai_questions.createIndex({ "tags": 1 })
```

---

### 5. `teacher_assessment_results`

**Purpose**: Store student assessment submissions and results

**Schema**:
```javascript
{
  "_id": ObjectId,                    // Primary key
  "assessment_id": String,            // Reference to teacher_assessments
  "student_id": String,               // Reference to users
  "student_name": String,             // Denormalized student name
  "score": Number,                    // Number of correct answers
  "total_questions": Number,          // Total number of questions
  "percentage": Number,               // Score percentage (0-100)
  "time_taken": Number,               // Time taken in seconds
  "submitted_at": ISODate,            // Submission timestamp
  "created_at": ISODate,              // Record creation timestamp
  
  "answers": Array<Number>,           // Student answers (indexes)
  "user_answers": Array<String>,      // Student answers (text)
  "questions": Array<Object>,         // Copy of questions for review
  
  "analytics": {
    "correct_by_difficulty": {
      "easy": Number,
      "medium": Number,
      "hard": Number
    },
    "time_per_question": Array<Number>,
    "question_accuracy": Array<Boolean>
  }
}
```

**Indexes**:
```javascript
db.teacher_assessment_results.createIndex({ "assessment_id": 1 })
db.teacher_assessment_results.createIndex({ "student_id": 1 })
db.teacher_assessment_results.createIndex({ "submitted_at": -1 })
db.teacher_assessment_results.createIndex({ "percentage": -1 })
db.teacher_assessment_results.createIndex({ "student_id": 1, "assessment_id": 1 }, { unique: true })
```

---

### 6. `notifications`

**Purpose**: Store user notifications

**Schema**:
```javascript
{
  "_id": ObjectId,                    // Primary key
  "user_id": ObjectId,                // Reference to users (optional)
  "student_id": String,               // Reference to users (student)
  "type": String,                     // Notification type
  "title": String,                    // Notification title
  "message": String,                  // Notification message
  "created_at": ISODate,              // Creation timestamp
  "is_read": Boolean,                 // Read status
  "read_at": ISODate,                 // Read timestamp
  "priority": String,                 // "low", "normal", "high", "urgent"
  
  // Related entities
  "assessment_id": String,            // Related assessment (optional)
  "batch_id": ObjectId,               // Related batch (optional)
  "teacher_id": ObjectId,             // Related teacher (optional)
  
  // Metadata
  "action_url": String,               // URL for action button
  "action_text": String,              // Text for action button
  "expires_at": ISODate               // Expiration timestamp
}
```

**Indexes**:
```javascript
db.notifications.createIndex({ "user_id": 1 })
db.notifications.createIndex({ "student_id": 1 })
db.notifications.createIndex({ "is_read": 1 })
db.notifications.createIndex({ "created_at": -1 })
db.notifications.createIndex({ "expires_at": 1 }, { expireAfterSeconds: 0 })
```

---

### 7. `coding_problems`

**Purpose**: Store coding challenges

**Schema**:
```javascript
{
  "_id": ObjectId,                    // Primary key
  "title": String,                    // Problem title
  "description": String,              // Problem description
  "difficulty": String,               // "easy", "medium", "hard"
  "topic": String,                    // Problem topic
  "tags": Array<String>,              // Problem tags
  "created_by": String,               // Reference to user (teacher)
  "created_at": ISODate,              // Creation timestamp
  "is_active": Boolean,               // Whether problem is active
  
  "constraints": {
    "time_limit": Number,             // Time limit in seconds
    "memory_limit": Number,           // Memory limit in MB
    "allowed_languages": Array<String> // Allowed programming languages
  },
  
  "test_cases": Array<{
    "input": String,                  // Test input
    "expected_output": String,        // Expected output
    "is_sample": Boolean,             // Whether it's a sample test case
    "points": Number                  // Points for this test case
  }>,
  
  "starter_code": {
    "python": String,
    "javascript": String,
    "java": String,
    "cpp": String
  },
  
  "solution": {
    "code": String,                   // Solution code
    "language": String,               // Solution language
    "explanation": String             // Solution explanation
  },
  
  "statistics": {
    "total_attempts": Number,
    "successful_submissions": Number,
    "average_time": Number,
    "difficulty_rating": Number
  }
}
```

---

## Relationships

### Entity Relationship Diagram

```
users (1) ─────── (N) batches
   │                    │
   │ (1)               (N)
   │                    │
   └────────────────────┘
         │
         │ (1)
         │
         ▼
   teacher_assessments (N)
         │
         │ (1)
         │
         ▼
   ai_questions (N)
         │
         │ (1)
         │
         ▼
   teacher_assessment_results (N)
         │
         │ (N)
         │
         ▼
   notifications (N)
```

### Relationship Details

**users → batches** (Many-to-One)
- Foreign Key: `users.batch_id` → `batches._id`
- A user (student) belongs to one batch
- A batch contains many students

**users → teacher_assessments** (One-to-Many)
- Foreign Key: `teacher_assessments.teacher_id` → `users._id`
- A teacher creates many assessments
- An assessment is created by one teacher

**teacher_assessments → batches** (Many-to-Many)
- Foreign Key: `teacher_assessments.batches` → `batches._id[]`
- An assessment can be assigned to multiple batches
- A batch can have multiple assessments

**teacher_assessments → ai_questions** (One-to-Many)
- Foreign Key: `ai_questions.assessment_id` → `teacher_assessments._id`
- An assessment contains many questions
- A question belongs to one assessment

**teacher_assessments → teacher_assessment_results** (One-to-Many)
- Foreign Key: `teacher_assessment_results.assessment_id` → `teacher_assessments._id`
- An assessment has many submissions
- A submission is for one assessment

**users → teacher_assessment_results** (One-to-Many)
- Foreign Key: `teacher_assessment_results.student_id` → `users._id`
- A student has many submissions
- A submission belongs to one student

**users → notifications** (One-to-Many)
- Foreign Key: `notifications.user_id` → `users._id`
- A user receives many notifications
- A notification belongs to one user

---

## Data Integrity

### Referential Integrity

Since MongoDB doesn't enforce foreign key constraints, the application enforces referential integrity:

1. **Cascade Delete**: When a batch is deleted, remove `batch_id` from all students
2. **Soft Delete**: Mark records as inactive instead of deleting
3. **Validation**: Check references exist before creating relationships
4. **Cleanup**: Regular jobs to clean orphaned records

### Data Validation

**At Application Level** (Pydantic):
```python
class UserModel(BaseModel):
    email: EmailStr
    role: Literal["student", "teacher", "admin"]
    level: int = Field(ge=1, le=100)
    average_score: float = Field(ge=0, le=100)
```

**At Database Level** (MongoDB Validation):
```javascript
db.createCollection("users", {
  validator: {
    $jsonSchema: {
      required: ["email", "role", "password_hash"],
      properties: {
        email: { type: "string", pattern: "^.+@.+$" },
        role: { enum: ["student", "teacher", "admin"] }
      }
    }
  }
})
```

---

## Performance Optimization

### Indexing Strategy

**Compound Indexes** for common queries:
```javascript
// Find student results for an assessment
db.teacher_assessment_results.createIndex({ 
  "student_id": 1, 
  "submitted_at": -1 
})

// Find active assessments for a teacher
db.teacher_assessments.createIndex({ 
  "teacher_id": 1, 
  "is_active": 1 
})

// Find unread notifications for a user
db.notifications.createIndex({ 
  "user_id": 1, 
  "is_read": 1, 
  "created_at": -1 
})
```

### Query Optimization

**Projection** - Fetch only required fields:
```javascript
db.users.find(
  { role: "student" },
  { email: 1, username: 1, batch_name: 1 }
)
```

**Aggregation Pipeline** for complex queries:
```javascript
db.teacher_assessment_results.aggregate([
  { $match: { assessment_id: "65abc..." } },
  { $group: {
      _id: null,
      avg_score: { $avg: "$percentage" },
      total_submissions: { $sum: 1 }
  }}
])
```

---

## Data Migration

### Schema Versioning

```javascript
{
  "_id": ObjectId,
  "_schema_version": "2.0",  // Track schema version
  // ... other fields
}
```

### Migration Script Example

```python
# Migrate users to add new fields
async def migrate_users_v2():
    db = await get_db()
    
    result = await db.users.update_many(
        { "_schema_version": { "$exists": False } },
        { "$set": {
            "_schema_version": "2.0",
            "preferences": {
                "theme": "light",
                "notifications": True,
                "language": "en"
            }
        }}
    )
    
    print(f"Migrated {result.modified_count} documents")
```

---

## Backup & Recovery

### Backup Strategy

1. **Daily Backups**: Automated MongoDB Atlas backups
2. **Point-in-Time Recovery**: 35-day retention
3. **Export Strategy**: Monthly full exports to S3
4. **Testing**: Quarterly restore tests

### Backup Command

```bash
# Create backup
mongodump --uri="mongodb://localhost:27017/edulearn" --out=/backup/$(date +%Y%m%d)

# Restore backup
mongorestore --uri="mongodb://localhost:27017/edulearn" /backup/20240115/edulearn/
```

---

This schema design supports the current application needs while allowing for future scalability and feature additions.

