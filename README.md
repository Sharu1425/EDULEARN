# EDULEARN — AI-powered Adaptive Learning Platform

A comprehensive full-stack educational platform that combines modern web technologies with artificial intelligence to create an intelligent learning ecosystem for students, teachers, and administrators.

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Python](https://img.shields.io/badge/python-3.8+-blue.svg)
![Node](https://img.shields.io/badge/node-18+-green.svg)

---

## 📑 Table of Contents

- [Key Features](#-key-features)
- [Technology Stack](#️-technology-stack)
- [Project Structure](#️-project-structure)
- [Quick Start](#-quick-start)
- [Configuration](#-configuration)
- [API Documentation](#-api-documentation)
- [Documentation](#-documentation)
- [Deployment](#-deployment)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🎯 Key Features

### 🎓 For Students

#### Assessment & Learning
- **AI-Powered Assessments**: Dynamic question generation using Google Gemini AI
  - Adaptive difficulty based on performance
  - Automatic question generation from topics
  - Comprehensive explanations for answers
  - Multiple question types (MCQ, Coding, Challenges)

- **Interactive Coding Platform**
  - Multi-language support (Python, JavaScript, Java, C++, etc.)
  - Real-time code execution with HackerEarth integration
  - Sandboxed execution environment
  - Syntax highlighting with Monaco Editor
  - Code submission and evaluation

- **Progress Tracking & Analytics**
  - Detailed performance insights
  - Topic-wise progress tracking
  - Historical test results
  - Performance trends and charts
  - Gamification with points and achievements
  - Leaderboard rankings

- **Personalized Learning**
  - AI-generated learning paths
  - Adaptive difficulty progression
  - Customized recommendations
  - Batch-based learning groups

#### Authentication & Security
- **Multiple Authentication Methods**
  - Email/Password registration and login
  - Google OAuth 2.0 integration
  - Face recognition login (biometric)
  - Secure JWT token-based sessions

#### User Experience
- **Modern UI/UX**
  - Dark/Light theme support
  - Responsive design (Mobile, Tablet, Desktop)
  - Smooth animations with Framer Motion
  - Real-time notifications
  - Interactive dashboards

### 👨‍🏫 For Teachers

#### Assessment Management
- **Smart Assessment Creation**
  - AI-assisted question generation
  - Manual MCQ creation
  - Coding challenge creation
  - Challenge-based assessments
  - Bulk question import
  - Assessment templates

- **Question Management**
  - Question bank organization
  - Topic categorization
  - Difficulty level management
  - Explanation attachments
  - Multi-option questions (2-6 options)

#### Student Management
- **Batch Management**
  - Create and organize student batches
  - Assign assessments to batches
  - Bulk student upload (CSV/Excel)
  - Student performance tracking
  - Batch analytics

- **Performance Monitoring**
  - Real-time student progress tracking
  - Individual student analytics
  - Batch performance comparison
  - Detailed test results
  - AI-generated student reports

#### Analytics & Reporting
- **Comprehensive Dashboard**
  - Student performance metrics
  - Assessment completion rates
  - Average scores and trends
  - Topic-wise analytics
  - Time-based reports

- **Advanced Features**
  - Real-time notifications
  - Batch performance control
  - Assessment history
  - Export reports (PDF, Excel)
  - Smart insights and recommendations

### 👑 For Administrators

#### User Management
- **Comprehensive User Administration**
  - User creation and management
  - Role-based access control (Student, Teacher, Admin)
  - User status management (Active, Inactive, Suspended)
  - Bulk user operations
  - User search and filtering

#### System Analytics
- **Platform-wide Statistics**
  - Total users by role
  - Assessment statistics
  - System usage metrics
  - Performance monitoring
  - Database optimization insights

#### Content Oversight
- **AI Content Management**
  - Monitor AI-generated questions
  - Approve/reject content
  - Quality control
  - Content categorization
  - Bulk content operations

#### System Management
- **Advanced Features**
  - System settings configuration
  - Database health monitoring
  - API performance tracking
  - Error logging and debugging
  - Backup and maintenance tools

---

## 🛠️ Technology Stack

### Backend Technologies

#### Core Framework
- **FastAPI 0.104.1** - Modern, fast (high-performance) web framework
- **Uvicorn 0.24.0** - Lightning-fast ASGI server
- **Python 3.8+** - Programming language

#### Database
- **MongoDB** - NoSQL document database
- **Motor 3.3.2** - Async Python driver for MongoDB
- **PyMongo 4.6.0** - Python MongoDB driver

#### Authentication & Security
- **JWT (JSON Web Tokens)** - python-jose[cryptography] 3.3.0
- **Bcrypt 4.1.2** - Password hashing
- **Passlib 1.7.4** - Password hashing library
- **Google OAuth 2.0** - Social authentication

#### AI & Code Execution
- **Google Gemini AI 0.3.2** - AI question generation
- **HackerEarth API** - Multi-language code execution
- **Sandboxed Execution** - Secure code running environment

#### Data Validation & Serialization
- **Pydantic 2.5.0** - Data validation using Python type hints
- **Python-Multipart 0.0.6** - Form data parsing

#### HTTP & API
- **HTTPX 0.25.2** - Modern async HTTP client
- **Requests 2.31.0** - HTTP library
- **CORS Middleware** - Cross-origin resource sharing

#### Background Tasks & Queues
- **Celery 5.3.4** - Distributed task queue
- **Redis 5.0.1** - In-memory data structure store

#### File Processing
- **Pandas 2.1.4** - Data manipulation and analysis
- **OpenPyXL 3.1.2** - Excel file handling
- **Aiofiles 23.2.1** - Async file operations

#### Monitoring & Logging
- **Structlog 23.2.0** - Structured logging
- **PSutil 5.9.6** - System and process utilities

#### Development Tools
- **Pytest 7.4.3** - Testing framework
- **Pytest-Asyncio 0.21.1** - Async test support
- **Pytest-Cov 4.1.0** - Code coverage
- **Black 23.11.0** - Code formatter
- **Flake8 6.1.0** - Code linter
- **Isort 5.12.0** - Import sorter

#### Additional Services
- **FastAPI-Mail 1.4.1** - Email services
- **SlowAPI 0.1.9** - Rate limiting
- **Python-Dotenv 1.0.0** - Environment variable management
- **OrJSON 3.9.10** - Fast JSON parsing

### Frontend Technologies

#### Core Framework
- **React 18.2.0** - Modern UI library
- **TypeScript 5.9.2** - Type-safe JavaScript
- **Vite 6.2.4** - Next-generation build tool

#### UI Components & Styling
- **Tailwind CSS 3.4.1** - Utility-first CSS framework
- **Lucide React 0.544.0** - Beautiful icon library
- **Heroicons React 2.2.0** - Additional icons
- **Framer Motion 11.0.8** - Animation library

#### Code Editing
- **Monaco Editor 0.53.0** - VS Code's code editor
- **@monaco-editor/react 4.7.0** - React wrapper for Monaco

#### Routing & State
- **React Router DOM 7.9.1** - Client-side routing
- **React Context API** - Global state management

#### Data Visualization
- **Recharts 2.12.0** - Chart library for React

#### HTTP & API
- **Axios 1.9.0** - Promise-based HTTP client

#### Authentication
- **@vladmandic/face-api 1.7.13** - Face recognition library
- **Google OAuth** - Social authentication

#### Analytics
- **@vercel/analytics 1.5.0** - Web analytics

#### Development Tools
- **ESLint 9.36.0** - JavaScript linter
- **ESLint Plugins** - React, Hooks, Refresh
- **PostCSS 8.4.35** - CSS transformations
- **Autoprefixer 10.4.21** - CSS vendor prefixes

---

## 🏗️ Project Structure

```
EDULEARN/
│
├── 📄 README.md                           # Main project documentation
├── 📄 LICENSE                             # MIT License file
├── 📄 assessment_flow_analysis.md         # Assessment workflow analysis
├── 📄 debug.log                           # Debug log file
├── 📄 package-lock.json                   # Root package lock
├── 📄 setup_test_users.py                 # Test user setup script
│
├── 📁 docs/                               # Documentation files
│   ├── 📄 PROJECT_STRUCTURE.md            # Project structure overview
│   ├── 📄 QUICK_START.md                  # Quick start guide
│   ├── 📄 README.md                       # Documentation index
│   └── 📄 setup_mongodb.md                # MongoDB setup guide
│
├── 📁 backend/                            # FastAPI Backend Application
│   ├── 📄 main.py                         # Application entry point
│   ├── 📄 requirements.txt                # Python dependencies
│   ├── 📄 env.example                     # Environment config template
│   ├── 📄 README.md                       # Backend documentation
│   ├── 📄 start_server.py                 # Server startup script
│   │
│   ├── 📄 init_database.py                # Database initialization
│   ├── 📄 maintenance_database.py         # Database maintenance
│   ├── 📄 test_api.py                     # API testing
│   ├── 📄 test_app_db.py                  # App database tests
│   ├── 📄 test_db.py                      # Database tests
│   ├── 📄 test_results.py                 # Results testing
│   │
│   ├── 📄 assessment_model_migration.py   # Assessment migration
│   ├── 📄 migration_assessment_models.py  # Model migration script
│   ├── 📄 migration_cli.py                # Migration CLI tool
│   ├── 📄 migration_manager.py            # Migration manager
│   ├── 📄 rollback_assessment_models.py   # Rollback script
│   │
│   ├── 📄 debug_other_collections.py      # Collection debugger
│   ├── 📄 debug_user_id.py                # User ID debugger
│   ├── 📄 fix_imports.py                  # Import fixer
│   ├── 📄 fix_response_models.py          # Response model fixer
│   │
│   ├── 📁 docs/                           # Backend documentation
│   │   ├── 📄 API_DOCUMENTATION.md        # API documentation
│   │   ├── 📄 MIGRATION_GUIDE.md          # Migration guide
│   │   ├── 📄 PRODUCTION_DEPLOYMENT_GUIDE.md  # Deployment guide
│   │   ├── 📄 api_documentation_templates.py  # API doc templates
│   │   └── 📄 generate_api_docs.py        # API doc generator
│   │
│   ├── 📁 logs/                           # Application logs
│   │   ├── 📄 app.log                     # Application log
│   │   └── 📄 error.log                   # Error log
│   │
│   └── 📁 app/                            # Main application package
│       ├── 📄 __init__.py                 # Package initializer
│       ├── 📄 main.py                     # FastAPI app instance
│       ├── 📄 dependencies.py             # FastAPI dependencies
│       │
│       ├── 📁 api/                        # API endpoints (routers)
│       │   ├── 📄 __init__.py             # API router initializer
│       │   ├── 📄 auth.py                 # Authentication endpoints
│       │   ├── 📄 users.py                # User management
│       │   ├── 📄 assessments.py          # Assessment endpoints
│       │   ├── 📄 assessments_old_backup.py  # Old assessment backup
│       │   ├── 📄 ai_questions.py         # AI question generation
│       │   ├── 📄 coding.py               # Coding platform
│       │   ├── 📄 results.py              # Results & analytics
│       │   ├── 📄 teacher.py              # Teacher dashboard
│       │   ├── 📄 admin.py                # Admin dashboard
│       │   ├── 📄 topics.py               # Topics management
│       │   ├── 📄 notifications.py        # Notification system
│       │   ├── 📄 health.py               # Health check endpoint
│       │   ├── 📄 test.py                 # Test endpoints
│       │   ├── 📄 bulk_students.py        # Bulk student operations
│       │   ├── 📄 bulk_teachers.py        # Bulk teacher operations
│       │   │
│       │   ├── 📁 admin/                  # Admin module endpoints
│       │   │   ├── 📄 __init__.py         # Admin router initializer
│       │   │   ├── 📄 users.py            # Admin user management
│       │   │   ├── 📄 analytics.py        # Admin analytics
│       │   │   └── 📄 content.py          # Content management
│       │   │
│       │   ├── 📁 assessments/            # Assessment module endpoints
│       │   │   ├── 📄 __init__.py         # Assessment router init
│       │   │   ├── 📄 core.py             # Core assessment logic
│       │   │   ├── 📄 teacher.py          # Teacher assessments
│       │   │   ├── 📄 submissions.py      # Assessment submissions
│       │   │   ├── 📄 notifications.py    # Assessment notifications
│       │   │   └── 📄 async_endpoints.py  # Async endpoints
│       │   │
│       │   ├── 📁 coding_modules/         # Coding module endpoints
│       │   │   ├── 📄 __init__.py         # Coding router initializer
│       │   │   ├── 📄 problems.py         # Coding problems
│       │   │   ├── 📄 execution.py        # Code execution
│       │   │   └── 📄 submissions.py      # Code submissions
│       │   │
│       │   └── 📁 teacher_modules/        # Teacher module endpoints
│       │       ├── 📄 __init__.py         # Teacher router init
│       │       ├── 📄 assessments.py      # Teacher assessments
│       │       ├── 📄 batches.py          # Batch management
│       │       ├── 📄 students.py         # Student management
│       │       └── 📄 reports.py          # Report generation
│       │
│       ├── 📁 core/                       # Configuration & security
│       │   ├── 📄 __init__.py             # Core initializer
│       │   ├── 📄 config.py               # Application settings
│       │   ├── 📄 security.py             # Security utilities
│       │   └── 📄 openapi_config.py       # OpenAPI configuration
│       │
│       ├── 📁 db/                         # Database management
│       │   ├── 📄 __init__.py             # Database initializer
│       │   ├── 📄 session.py              # MongoDB connection
│       │   └── 📄 mock_db.py              # Mock database for testing
│       │
│       ├── 📁 decorators/                 # Custom decorators
│       │   ├── 📄 __init__.py             # Decorators initializer
│       │   └── 📄 validation_decorators.py  # Validation decorators
│       │
│       ├── 📁 middleware/                 # Custom middleware
│       │   ├── 📄 __init__.py             # Middleware initializer
│       │   ├── 📄 logging_middleware.py   # Logging middleware
│       │   └── 📄 validation_middleware.py  # Validation middleware
│       │
│       ├── 📁 models/                     # Database models
│       │   ├── 📄 __init__.py             # Models initializer
│       │   ├── 📄 models.py               # MongoDB document models
│       │   └── 📄 unified_models.py       # Unified model definitions
│       │
│       ├── 📁 schemas/                    # Pydantic schemas
│       │   ├── 📄 __init__.py             # Schemas initializer
│       │   └── 📄 schemas.py              # Request/response validation
│       │
│       ├── 📁 services/                   # Business logic services
│       │   ├── 📄 __init__.py             # Services initializer
│       │   ├── 📄 assessment_service.py   # Assessment business logic
│       │   ├── 📄 batch_service.py        # Batch operations
│       │   ├── 📄 code_execution_service.py  # Code execution
│       │   ├── 📄 gemini_coding_service.py   # Gemini AI integration
│       │   ├── 📄 hackerearth_execution_service.py  # HackerEarth integration
│       │   ├── 📄 notification_service.py    # Notifications
│       │   ├── 📄 enhanced_notification_service.py  # Enhanced notifications
│       │   ├── 📄 background_task_service.py  # Background tasks
│       │   ├── 📄 validation_service.py      # Validation logic
│       │   ├── 📄 database_optimization_service.py  # DB optimization
│       │   ├── 📄 query_optimization_service.py  # Query optimization
│       │   └── 📄 structured_logging_service.py  # Structured logging
│       │
│       └── 📁 utils/                      # Utility functions
│           ├── 📄 __init__.py             # Utils initializer
│           ├── 📄 auth_utils.py           # Authentication utilities
│           ├── 📄 validators.py           # Data validation
│           ├── 📄 error_handler.py        # Error handling
│           └── 📄 exceptions.py           # Custom exceptions
│
└── 📁 frontend/                           # React Frontend Application
    ├── 📄 index.html                      # HTML entry point
    ├── 📄 package.json                    # Frontend dependencies
    ├── 📄 package-lock.json               # Dependency lock file
    ├── 📄 README.md                       # Frontend documentation
    ├── 📄 vite.config.js                  # Vite configuration
    ├── 📄 tsconfig.json                   # TypeScript configuration
    ├── 📄 tailwind.config.js              # Tailwind CSS config
    ├── 📄 postcss.config.cjs              # PostCSS configuration
    ├── 📄 eslint.config.js                # ESLint configuration
    │
    ├── 📁 node_modules/                   # Node dependencies (gitignored)
    │
    └── 📁 src/                            # Source code
        ├── 📄 App.tsx                     # Main App component
        ├── 📄 main.tsx                    # Application entry point
        ├── 📄 index.css                   # Global styles
        │
        ├── 📁 api/                        # API services
        │   ├── 📄 index.ts                # Service exports
        │   ├── 📄 authService.ts          # Authentication API
        │   ├── 📄 assessmentService.ts    # Assessment API
        │   ├── 📄 codingService.ts        # Coding platform API
        │   ├── 📄 bulkStudentService.ts   # Bulk student operations
        │   └── 📄 bulkTeacherService.ts   # Bulk teacher operations
        │
        ├── 📁 components/                 # Reusable components
        │   ├── 📄 Navbar.tsx              # Navigation bar
        │   ├── 📄 ProtectedRoute.tsx      # Route protection
        │   ├── 📄 AnimatedBackground.tsx  # Animated background
        │   ├── 📄 BackendStatusIndicator.tsx  # Backend status
        │   ├── 📄 AssessmentResults.tsx   # Assessment results
        │   ├── 📄 TestInterface.tsx       # Test interface
        │   ├── 📄 CodingTestInterface.tsx # Coding test UI
        │   ├── 📄 CodingQuestionForm.tsx  # Coding question form
        │   ├── 📄 BulkUploadModal.tsx     # Bulk upload modal
        │   ├── 📄 GamificationPanel.tsx   # Gamification features
        │   ├── 📄 Leaderboard.tsx         # Leaderboard display
        │   ├── 📄 ProgressCharts.tsx      # Progress charts
        │   ├── 📄 StatsCard.tsx           # Statistics card
        │   ├── 📄 NotificationBar.tsx     # Notification bar
        │   ├── 📄 LoadingState.tsx        # Loading state
        │   ├── 📄 ErrorState.tsx          # Error state
        │   ├── 📄 EmptyState.tsx          # Empty state
        │   │
        │   ├── 📁 ui/                     # Basic UI components
        │   │   ├── 📄 Button.tsx          # Button component
        │   │   ├── 📄 Card.tsx            # Card component
        │   │   ├── 📄 Input.tsx           # Input component
        │   │   ├── 📄 LoadingSpinner.tsx  # Loading spinner
        │   │   ├── 📄 Toast.tsx           # Toast notification
        │   │   ├── 📄 ToastContainer.tsx  # Toast container
        │   │   ├── 📄 CodeEditor.tsx      # Monaco code editor
        │   │   ├── 📄 QuestionCard.tsx    # Question card
        │   │   ├── 📄 ConfirmDialog.tsx   # Confirmation dialog
        │   │   ├── 📄 BrandLogo.tsx       # Brand logo
        │   │   ├── 📄 ThemeToggle.tsx     # Theme toggle
        │   │   ├── 📄 ProgressRing.tsx    # Progress ring
        │   │   ├── 📄 PageShell.tsx       # Page shell wrapper
        │   │   ├── 📄 FloatingActionButton.tsx  # FAB button
        │   │   └── 📄 UserProfileDropdown.tsx   # User dropdown
        │   │
        │   ├── 📁 admin/                  # Admin components
        │   │   ├── 📄 EnhancedAdminDashboard.tsx  # Admin dashboard
        │   │   ├── 📄 UserManagement.tsx          # User management
        │   │   ├── 📄 SystemAnalytics.tsx         # System analytics
        │   │   ├── 📄 ContentOversight.tsx        # Content oversight
        │   │   ├── 📄 ContentDataManager.tsx      # Content manager
        │   │   ├── 📄 BulkTeacherUploadModal.tsx  # Bulk teacher upload
        │   │   └── 📄 SettingsPanel.tsx           # Settings panel
        │   │
        │   └── 📁 teacher/                # Teacher components
        │       ├── 📄 SmartAssessmentCreator.tsx  # Assessment creator
        │       ├── 📄 AssessmentAnalytics.tsx     # Assessment analytics
        │       ├── 📄 PerformanceAnalytics.tsx    # Performance analytics
        │       ├── 📄 BatchPerformanceControl.tsx # Batch performance
        │       ├── 📄 AIStudentReports.tsx        # AI student reports
        │       ├── 📄 RealTimeNotifications.tsx   # Real-time notifications
        │       │
        │       ├── 📁 assessment-management/  # Assessment mgmt
        │       │   ├── 📄 index.ts            # Module exports
        │       │   ├── 📄 AssessmentForm.tsx  # Assessment form
        │       │   ├── 📄 AssessmentHistory.tsx  # Assessment history
        │       │   ├── 📄 QuestionManager.tsx    # Question manager
        │       │   └── 📄 BatchSelector.tsx      # Batch selector
        │       │
        │       └── 📁 student-management/     # Student mgmt
        │           ├── 📄 index.ts            # Module exports
        │           ├── 📄 StudentList.tsx     # Student list
        │           ├── 📄 StudentStats.tsx    # Student statistics
        │           ├── 📄 BatchGrid.tsx       # Batch grid view
        │           ├── 📄 StudentDetailsModal.tsx  # Student details
        │           └── 📄 BatchAssignmentModal.tsx # Batch assignment
        │
        ├── 📁 contexts/                   # React contexts
        │   ├── 📄 ThemeContext.tsx        # Theme management
        │   └── 📄 ToastContext.tsx        # Notification system
        │
        ├── 📁 hooks/                      # Custom React hooks
        │   ├── 📄 index.ts                # Hook exports
        │   ├── 📄 useAuth.ts              # Authentication hook
        │   ├── 📄 useAssessments.ts       # Assessments hook
        │   ├── 📄 useBatches.ts           # Batches hook
        │   ├── 📄 useStudents.ts          # Students hook
        │   └── 📄 useNotifications.ts     # Notifications hook
        │
        ├── 📁 pages/                      # Page components
        │   ├── 📄 LandingPage.tsx         # Landing page
        │   ├── 📄 Login.tsx               # Login page
        │   ├── 📄 Signup.tsx              # Signup page
        │   ├── 📄 Dashboard.tsx           # Student dashboard
        │   ├── 📄 UserProfile.tsx         # User profile
        │   ├── 📄 Settings.tsx            # User settings
        │   │
        │   ├── 📄 Assessment.tsx          # Assessment interface
        │   ├── 📄 AssessmentChoice.tsx    # Assessment selection
        │   ├── 📄 AssessConfig.tsx        # Assessment config
        │   ├── 📄 UnifiedAssessment.tsx   # Unified assessment
        │   ├── 📄 AssessmentManagement.tsx  # Assessment mgmt
        │   ├── 📄 CreateAssessment.tsx    # Create assessment
        │   │
        │   ├── 📄 CodingPlatform.tsx      # Coding platform
        │   ├── 📄 CodingProblem.tsx       # Coding problem
        │   │
        │   ├── 📄 Results.tsx             # Results page
        │   ├── 📄 TestPage.tsx            # Test page
        │   ├── 📄 TestResultDetail.tsx    # Test result details
        │   │
        │   ├── 📄 TeacherDashboard.tsx    # Teacher dashboard
        │   ├── 📄 TeacherProfile.tsx      # Teacher profile
        │   ├── 📄 TeacherSettings.tsx     # Teacher settings
        │   ├── 📄 TeacherAssessmentHistory.tsx  # Assessment history
        │   ├── 📄 TeacherAssessmentResults.tsx  # Assessment results
        │   ├── 📄 TeacherResultsDashboard.tsx   # Results dashboard
        │   │
        │   ├── 📄 StudentManagement.tsx   # Student management
        │   └── 📄 BatchAnalytics.tsx      # Batch analytics
        │
        ├── 📁 services/                   # Business logic
        │   └── 📄 notificationService.ts  # Notification service
        │
        ├── 📁 types/                      # TypeScript types
        │   └── 📄 index.ts                # Type definitions
        │
        └── 📁 utils/                      # Utility functions
            ├── 📄 api.ts                  # API configuration
            ├── 📄 constants.ts            # Application constants
            └── 📄 roleUtils.ts            # Role-based utilities
```

---

## 🚀 Quick Start

### Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** 18+ and npm/yarn
- **Python** 3.8+
- **MongoDB** (local or cloud)
- **Google AI API key** (for Gemini integration)
- **Git** (for version control)

### Backend Setup

1. **Navigate to backend directory**
   ```bash
   cd backend
   ```

2. **Create virtual environment**
   ```bash
   python -m venv venv
   ```

3. **Activate virtual environment**
   - **Windows:**
     ```bash
     venv\Scripts\activate
     ```
   - **macOS/Linux:**
     ```bash
     source venv/bin/activate
     ```

4. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

5. **Set up environment variables**
   ```bash
   cp env.example .env
   ```
   
   Edit `.env` with your configuration:
   ```env
   # Database
   MONGO_URI=mongodb://localhost:27017
   DB_NAME=edulearn
   
   # Security
   SECRET_KEY=your-secret-key-here
   
   # AI Services
   GEMINI_API_KEY=your-google-ai-api-key
   
   # Google OAuth
   GOOGLE_CLIENT_ID=your-google-client-id
   GOOGLE_CLIENT_SECRET=your-google-client-secret
   
   # HackerEarth (Optional)
   HACKEREARTH_CLIENT_SECRET=your-hackerearth-client-secret
   ```

6. **Initialize database**
   ```bash
   python init_database.py
   ```

7. **Run the backend server**
   ```bash
   python main.py
   ```
   
   Or using uvicorn directly:
   ```bash
   uvicorn app.main:app --reload --host 0.0.0.0 --port 5001
   ```

   The backend will be available at: **http://localhost:5001**

### Frontend Setup

1. **Navigate to frontend directory** (in a new terminal)
   ```bash
   cd frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment** (Optional)
   Create `.env` file:
   ```env
   VITE_API_BASE_URL=http://localhost:5001
   VITE_GOOGLE_CLIENT_ID=your-google-client-id
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

   The frontend will be available at: **http://localhost:5173**

### Access the Application

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:5001
- **API Documentation**: http://localhost:5001/docs
- **ReDoc**: http://localhost:5001/redoc

### Create Test Users

Run the test user setup script:
```bash
python setup_test_users.py
```

This creates:
- **Admin User**: admin@edulearn.com / admin123
- **Teacher User**: teacher@edulearn.com / teacher123
- **Student User**: student@edulearn.com / student123

---

## 🔧 Configuration

### Backend Environment Variables

Create a `.env` file in the `backend` directory with the following variables:

```env
# Application
APP_NAME=eduLearn API
APP_VERSION=1.0.0
DEBUG=False

# Database Configuration
MONGO_URI=mongodb://localhost:27017
DB_NAME=edulearn

# Security
SECRET_KEY=your-super-secret-key-change-this-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
SESSION_SECRET=your-session-secret-key

# AI Services
GEMINI_API_KEY=your-google-gemini-api-key

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Code Execution
CODE_EXECUTION_TIMEOUT=5
CODE_MEMORY_LIMIT=256
HACKEREARTH_CLIENT_SECRET=your-hackerearth-client-secret

# CORS Origins (comma-separated)
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000

# Email Configuration (Optional)
MAIL_USERNAME=your-email@gmail.com
MAIL_PASSWORD=your-app-password
MAIL_FROM=your-email@gmail.com
MAIL_PORT=587
MAIL_SERVER=smtp.gmail.com
MAIL_TLS=True
MAIL_SSL=False
```

### Frontend Environment Variables

Create a `.env` file in the `frontend` directory:

```env
# API Configuration
VITE_API_BASE_URL=http://localhost:5001

# Google OAuth
VITE_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com

# Analytics (Optional)
VITE_ANALYTICS_ID=your-analytics-id
```

### MongoDB Configuration

1. **Local MongoDB**
   - Install MongoDB Community Edition
   - Start MongoDB service
   - Default URI: `mongodb://localhost:27017`

2. **MongoDB Atlas (Cloud)**
   - Create a free cluster at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
   - Get connection string
   - Update `MONGO_URI` in `.env`
   - Example: `mongodb+srv://user:password@cluster.mongodb.net/edulearn`

---

## 📚 API Documentation

### Comprehensive API Reference

📘 **[Complete API Reference](./docs/COMPLETE_API_REFERENCE.md)** - Complete documentation of all 100+ API endpoints with:
- Detailed request/response examples
- Frontend-backend endpoint mapping
- Authentication flows
- Error handling guides
- Best practices

📋 **[API Endpoints Summary](./docs/API_ENDPOINTS_SUMMARY.md)** - Quick reference table of all endpoints

### Interactive API Documentation

When the backend is running, access:

- **Swagger UI**: http://localhost:5001/docs
  - Interactive API exploration
  - Try out endpoints
  - View request/response schemas

- **ReDoc**: http://localhost:5001/redoc
  - Clean, readable documentation
  - Better for reading and understanding

### Main API Endpoints Overview

#### Authentication (`/api/auth/*`)
```
POST   /api/auth/register        - User registration
POST   /api/auth/login           - User login
POST   /api/auth/google-login    - Google OAuth login
POST   /api/auth/face-login      - Face recognition login
GET    /api/auth/me              - Get current user
POST   /api/auth/logout          - User logout
POST   /api/auth/refresh         - Refresh access token
```

#### Users (`/api/users/*`)
```
GET    /api/users                - Get all users (admin)
GET    /api/users/{id}           - Get user by ID
PUT    /api/users/{id}           - Update user
DELETE /api/users/{id}           - Delete user
GET    /api/users/me             - Get current user profile
PUT    /api/users/me             - Update current user profile
```

#### Assessments (`/api/assessments/*`, `/api/teacher/assessments/*`)
```
POST   /api/teacher/assessments/create      - Create assessment
POST   /api/teacher/assessments/generate    - Generate AI assessment
GET    /api/assessments                     - Get assessments
GET    /api/assessments/{id}                - Get assessment by ID
PUT    /api/assessments/{id}                - Update assessment
DELETE /api/assessments/{id}                - Delete assessment
POST   /api/assessments/{id}/submit         - Submit assessment
POST   /api/assessments/{id}/assign-batches - Assign to batches
GET    /api/assessments/{id}/results        - Get results
```

#### Coding Platform (`/api/coding/*`)
```
POST   /api/coding/problems/generate   - Generate AI coding problem
GET    /api/coding/problems            - Get coding problems
GET    /api/coding/problems/{id}       - Get problem by ID
POST   /api/coding/execute             - Execute code
POST   /api/coding/submit              - Submit solution
GET    /api/coding/submissions         - Get submissions
GET    /api/coding/submissions/{id}    - Get submission by ID
```

#### Teacher (`/api/teacher/*`)
```
GET    /api/teacher/dashboard          - Teacher dashboard data
GET    /api/teacher/students           - Get students
GET    /api/teacher/batches            - Get batches
POST   /api/teacher/batches            - Create batch
PUT    /api/teacher/batches/{id}       - Update batch
DELETE /api/teacher/batches/{id}       - Delete batch
POST   /api/teacher/students/bulk      - Bulk upload students
GET    /api/teacher/analytics          - Get analytics
GET    /api/teacher/reports            - Generate reports
```

#### Admin (`/api/admin/*`)
```
GET    /api/admin/dashboard            - Admin dashboard
GET    /api/admin/users                - User management
POST   /api/admin/users                - Create user
PUT    /api/admin/users/{id}           - Update user
DELETE /api/admin/users/{id}           - Delete user
GET    /api/admin/analytics            - System analytics
GET    /api/admin/content              - Content oversight
POST   /api/admin/content/approve      - Approve content
POST   /api/admin/content/reject       - Reject content
POST   /api/admin/teachers/bulk        - Bulk upload teachers
```

#### Results & Analytics (`/api/results/*`)
```
GET    /api/results                    - Get results
GET    /api/results/{id}               - Get result by ID
GET    /api/results/student/{id}       - Student results
GET    /api/results/assessment/{id}    - Assessment results
GET    /api/results/analytics          - Analytics data
```

#### Notifications (`/api/notifications/*`)
```
GET    /api/notifications              - Get notifications
POST   /api/notifications              - Create notification
PUT    /api/notifications/{id}/read    - Mark as read
DELETE /api/notifications/{id}         - Delete notification
```

#### Health Check
```
GET    /health/                        - Basic health check
GET    /health/db                      - Database health
GET    /health/system                  - System resources
GET    /health/comprehensive           - Full health check
```

**For complete API documentation with 100+ endpoints, see [Complete API Reference](./docs/COMPLETE_API_REFERENCE.md)**

---

## 🧪 Testing

### Backend Tests

```bash
cd backend

# Run all tests
python -m pytest

# Run with coverage
python -m pytest --cov=app

# Run specific test file
python test_api.py

# Run database tests
python test_db.py
```

### Frontend Tests

```bash
cd frontend

# Run tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with coverage
npm test -- --coverage
```

### API Testing

Use the provided test scripts:

```bash
cd backend

# Test API endpoints
python test_api.py

# Test database operations
python test_db.py

# Test assessment results
python test_results.py
```

---

## 📦 Deployment

### Backend Deployment

#### Option 1: Render
1. Create account on [Render](https://render.com)
2. Create new Web Service
3. Connect GitHub repository
4. Configure:
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - Set environment variables
5. Deploy

#### Option 2: Railway
1. Create account on [Railway](https://railway.app)
2. Create new project
3. Connect GitHub repository
4. Add MongoDB database
5. Configure environment variables
6. Deploy

#### Option 3: Docker
```dockerfile
# Dockerfile
FROM python:3.9-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

```bash
# Build and run
docker build -t edulearn-backend .
docker run -p 8000:8000 edulearn-backend
```

### Frontend Deployment

#### Option 1: Vercel
1. Create account on [Vercel](https://vercel.com)
2. Import GitHub repository
3. Configure:
   - **Framework**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - Set environment variables
4. Deploy

#### Option 2: Netlify
1. Create account on [Netlify](https://netlify.com)
2. Connect GitHub repository
3. Configure:
   - **Build Command**: `npm run build`
   - **Publish Directory**: `dist`
   - Set environment variables
4. Deploy

#### Option 3: Build Manually
```bash
cd frontend

# Build for production
npm run build

# The 'dist' folder contains production build
# Upload to any static hosting service
```

### Database Deployment

#### MongoDB Atlas (Recommended)
1. Create account on [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create free cluster
3. Configure network access (allow from anywhere for production)
4. Create database user
5. Get connection string
6. Update `MONGO_URI` in production environment

---

## 🎨 Features Deep Dive

### AI-Powered Question Generation

The platform uses Google Gemini AI to generate contextual questions:

```python
# Example: Generate assessment questions
{
  "topic": "Python Data Structures",
  "difficulty": "medium",
  "question_count": 10
}

# Returns: 10 AI-generated questions with:
# - Multiple choice options
# - Correct answers
# - Detailed explanations
# - Difficulty-appropriate content
```

### Multi-Language Code Execution

Supports multiple programming languages:

- **Python** 3.x
- **JavaScript** (Node.js)
- **Java** 11+
- **C++** 17
- **C** (GCC)
- **Ruby**
- **Go**
- **Rust**
- **PHP**
- **Swift**

### Real-Time Features

- **Live Notifications**: Real-time updates using WebSocket
- **Live Leaderboard**: Instant ranking updates
- **Progress Tracking**: Real-time progress visualization
- **Code Execution**: Instant feedback on code submissions

### Gamification System

- **Points System**: Earn points for completed assessments
- **Achievements**: Unlock badges and achievements
- **Leaderboard**: Compete with peers
- **Progress Levels**: Advance through difficulty levels
- **Streaks**: Maintain learning streaks

---

## 🛡️ Security Features

### Authentication
- **JWT Tokens**: Secure token-based authentication
- **Password Hashing**: Bcrypt password encryption
- **OAuth 2.0**: Google social login
- **Face Recognition**: Biometric authentication
- **Session Management**: Secure session handling

### Authorization
- **Role-Based Access Control (RBAC)**:
  - Student role
  - Teacher role
  - Admin role
- **Route Protection**: Protected API endpoints
- **Permission Checking**: Granular permissions

### Data Security
- **Input Validation**: Pydantic schema validation
- **SQL Injection Prevention**: MongoDB parameterized queries
- **XSS Protection**: Input sanitization
- **CORS Configuration**: Controlled cross-origin access
- **Rate Limiting**: API rate limiting (SlowAPI)

### Code Execution Security
- **Sandboxed Environment**: Isolated code execution
- **Timeout Limits**: Prevent infinite loops
- **Memory Limits**: Prevent memory overflow
- **Resource Restrictions**: CPU and disk limits

---

## 🤝 Contributing

We welcome contributions! Here's how you can help:

### Getting Started

1. **Fork the repository**
   ```bash
   git clone https://github.com/yourusername/edulearn.git
   cd edulearn
   ```

2. **Create a feature branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```

3. **Make your changes**
   - Follow coding standards
   - Add tests for new features
   - Update documentation

4. **Commit your changes**
   ```bash
   git add .
   git commit -m 'Add some amazing feature'
   ```

5. **Push to the branch**
   ```bash
   git push origin feature/amazing-feature
   ```

6. **Open a Pull Request**

### Coding Standards

#### Backend (Python)
- Follow **PEP 8** style guide
- Use **Black** for code formatting
- Use **Flake8** for linting
- Use **Isort** for import sorting
- Write docstrings for functions/classes
- Add type hints

#### Frontend (TypeScript/React)
- Follow **ESLint** rules
- Use **Prettier** for formatting
- Use TypeScript for type safety
- Follow React best practices
- Write clean, reusable components

### Pull Request Guidelines

- **Clear Description**: Explain what and why
- **Single Responsibility**: One feature per PR
- **Tests**: Include tests for new features
- **Documentation**: Update docs if needed
- **No Breaking Changes**: Unless discussed

---

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

```
MIT License

Copyright (c) 2024 EDULEARN

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

## 👥 Authors & Acknowledgments

### Development Team
- **EDULEARN Development Team** - Core development and architecture

### Technologies & Services
- **Google Gemini AI** - AI-powered question generation
- **Judge0** - Multi-language code execution
- **MongoDB** - Database solution
- **FastAPI** - Backend framework
- **React** - Frontend library
- **Tailwind CSS** - UI styling

### Special Thanks
- All contributors and testers
- Open-source community
- Education technology enthusiasts

---

## 🆘 Support & Help

### Documentation

#### 📖 Feature Documentation (NEW!)
Complete guides explaining how each feature works with detailed flows and diagrams:
- **[Features Overview](./docs/FEATURES_OVERVIEW.md)** - Complete feature catalog
- **[Authentication Features](./docs/AUTHENTICATION_FEATURES.md)** - Login, OAuth, face recognition
- **[Assessment Features](./docs/ASSESSMENT_FEATURES.md)** - Assessment creation and grading
- **[Student Features](./docs/STUDENT_FEATURES.md)** - Dashboard, gamification
- **[Teacher Features](./docs/TEACHER_FEATURES.md)** - Batch management, analytics
- **[Admin Features](./docs/ADMIN_FEATURES.md)** - Platform administration
- **[Coding Platform](./docs/CODING_PLATFORM_FEATURES.md)** - Problem generation, code execution

#### 🔌 API Documentation
- **[Complete API Reference](./docs/COMPLETE_API_REFERENCE.md)** - All 100+ endpoints
- **[API Endpoints Summary](./docs/API_ENDPOINTS_SUMMARY.md)** - Quick reference

#### 📋 Setup & Deployment
- **Quick Start Guide**: `docs/QUICK_START.md`
- **Project Structure**: `docs/PROJECT_STRUCTURE.md`
- **MongoDB Setup**: `docs/setup_mongodb.md`
- **Migration Guide**: `backend/docs/MIGRATION_GUIDE.md`
- **Deployment Guide**: `backend/docs/PRODUCTION_DEPLOYMENT_GUIDE.md`

### Getting Help
1. **Check Documentation**: Review the docs folder
2. **API Docs**: Visit `/docs` when backend is running
3. **Create Issue**: Open an issue on GitHub
4. **Community**: Join our community discussions

### Reporting Bugs
When reporting bugs, please include:
- OS and version
- Python/Node.js version
- Steps to reproduce
- Expected vs actual behavior
- Error messages and logs

### Feature Requests
We welcome feature requests! Please:
- Check existing issues first
- Describe the feature clearly
- Explain the use case
- Suggest implementation (optional)

---

## 🎓 Educational Use

EDULEARN is designed for educational institutions:

- **Schools & Colleges**: Manage classes and assessments
- **Coding Bootcamps**: Track student progress
- **Online Courses**: Automated grading system
- **Private Tutoring**: Personalized learning paths

### Use Cases

1. **Classroom Teaching**
   - Create assignments
   - Track student progress
   - Generate reports

2. **Remote Learning**
   - Online assessments
   - Virtual coding challenges
   - Real-time feedback

3. **Self-Paced Learning**
   - Adaptive difficulty
   - Personalized paths
   - Progress tracking

4. **Competitive Programming**
   - Coding challenges
   - Leaderboards
   - Time-based contests

---

## 🔮 Roadmap

### Current Version (v1.0.0)
- ✅ Core assessment system
- ✅ AI question generation
- ✅ Multi-language code execution
- ✅ User management
- ✅ Analytics dashboard

### Upcoming Features

#### v1.1.0
- [ ] Real-time collaboration
- [ ] Video conferencing integration
- [ ] Mobile app (React Native)
- [ ] Offline mode support

#### v1.2.0
- [ ] Advanced AI tutoring
- [ ] Plagiarism detection
- [ ] Code review system
- [ ] Peer-to-peer learning

#### v2.0.0
- [ ] Microservices architecture
- [ ] GraphQL API
- [ ] Advanced analytics with ML
- [ ] Multi-tenant support

---

## 📊 Project Statistics

- **Lines of Code**: 50,000+
- **Files**: 150+
- **Components**: 80+
- **API Endpoints**: 100+
- **Supported Languages**: 10+
- **Technologies Used**: 30+

---

## 🌟 Why EDULEARN?

### For Educators
- **Save Time**: Automated grading and AI-generated questions
- **Better Insights**: Detailed analytics and reports
- **Easy Management**: Simple batch and student management
- **Flexible**: Customize assessments and learning paths

### For Students
- **Personalized**: Adaptive learning based on performance
- **Interactive**: Engaging coding challenges
- **Progress Tracking**: See your improvement over time
- **Gamified**: Fun with achievements and leaderboards

### For Institutions
- **Scalable**: Handle thousands of students
- **Cost-Effective**: Open-source and free
- **Secure**: Enterprise-grade security
- **Modern**: Latest technologies and best practices

---

## 📞 Contact

- **Project Website**: [modlrn.vercel.app](https://modlrn.vercel.app)
- **GitHub**: [github.com/edulearn](https://github.com/edulearn)
- **Email**: support@modlrn.com
- **Documentation**: [docs.modlrn.com](https://docs.modlrn.com)

---

## 🙏 Acknowledgments

This project wouldn't be possible without:

- **Google Gemini AI** - For powerful AI capabilities
- **FastAPI Community** - For amazing framework
- **React Team** - For incredible UI library
- **MongoDB** - For flexible database solution
- **Open Source Community** - For inspiration and support

---

<div align="center">

**EDULEARN** - Empowering education through AI-driven adaptive learning

[![Star on GitHub](https://img.shields.io/github/stars/edulearn/modlrn?style=social)](https://github.com/edulearn/modlrn)
[![Follow on Twitter](https://img.shields.io/twitter/follow/modlrn?style=social)](https://twitter.com/modlrn)

Made with ❤️ by the EDULEARN Team

</div>
