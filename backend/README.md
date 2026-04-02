# EDULEARN Backend

FastAPI backend for the EDULEARN AI-powered Adaptive Learning Platform.

## 📋 Table of Contents

- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Running the Server](#running-the-server)
- [Project Structure](#project-structure)
- [API Documentation](#api-documentation)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)

## ✅ Prerequisites

Before you begin, ensure you have the following installed:

- **Python 3.8+** (Python 3.10+ recommended)
- **MongoDB 4.4+** (Local installation or MongoDB Atlas account)
- **Google Gemini API Key** (for AI question generation)
- **HackerEarth API Key** (Optional, for code execution)

### System Requirements

- **RAM**: Minimum 2GB, Recommended 4GB+
- **Storage**: 500MB free space
- **Network**: Internet connection for AI services and MongoDB Atlas (if using cloud)

## 🚀 Installation

### Step 1: Clone the Repository

```bash
git clone <repository-url>
cd edulearn/backend
```

### Step 2: Create Virtual Environment

```bash
# Windows
python -m venv venv
venv\Scripts\activate

# macOS/Linux
python3 -m venv venv
source venv/bin/activate
```

### Step 3: Install Dependencies

```bash
pip install --upgrade pip
pip install -r requirements.txt
```

**Note**: If you encounter any installation errors, try:
```bash
pip install -r requirements.txt --no-cache-dir
```

### Step 4: Set Up Environment Variables

1. Copy the example environment file:
   ```bash
   cp env.example .env
   ```

2. Edit `.env` with your configuration (see [Configuration](#configuration) section)

### Step 5: Set Up MongoDB

#### Option A: Local MongoDB

1. Install MongoDB locally:
   - **Windows**: Download from [MongoDB Download Center](https://www.mongodb.com/try/download/community)
   - **macOS**: `brew install mongodb-community`
   - **Linux**: Follow [MongoDB Installation Guide](https://docs.mongodb.com/manual/installation/)

2. Start MongoDB service:
   ```bash
   # Windows (run as administrator)
   net start MongoDB
   
   # macOS/Linux
   sudo systemctl start mongod
   # or
   mongod --dbpath ~/data/db
   ```

3. Verify MongoDB is running:
   ```bash
   mongosh
   # or
   mongo
   ```

#### Option B: MongoDB Atlas (Cloud)

1. Create a free account at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a new cluster (free tier available)
3. Create a database user
4. Whitelist your IP address (or use `0.0.0.0/0` for development)
5. Get your connection string
6. Update `MONGO_URI` in `.env` file

### Step 6: Initialize Database (Optional)

Run the initialization script to create test users:

```bash
python init_database.py
```

This creates:
- **Admin User**: admin@edulearn.com / admin123
- **Teacher User**: teacher@edulearn.com / teacher123
- **Student User**: student@edulearn.com / student123

## ⚙️ Configuration

Create a `.env` file in the `backend` directory with the following variables:

```env
# Database Configuration
MONGO_URI=mongodb://127.0.0.1:27017/edulearn
# For MongoDB Atlas, use:
# MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/edulearn
DB_NAME=edulearn

# Security Settings
SECRET_KEY=your-super-secret-key-change-this-in-production-min-32-chars
SESSION_SECRET=your-session-secret-key-min-32-chars
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# AI Services - Google Gemini
GEMINI_API_KEY=your-google-gemini-api-key
# Get your API key from: https://makersuite.google.com/app/apikey

# Google OAuth (Optional - for social login)
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
# Get OAuth credentials from: https://console.cloud.google.com/apis/credentials

# Code Execution - HackerEarth API (Optional)
HACKEREARTH_CLIENT_SECRET=your-hackerearth-client-secret
# Get API secret from: https://www.hackerearth.com/docs/wiki/developers/v4/

# Application Settings
DEBUG=false
APP_NAME=eduLearn API
APP_VERSION=1.0.0
```

### Getting API Keys

1. **Google Gemini API Key**:
   - Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
   - Sign in with Google account
   - Create new API key
   - Copy and paste into `.env`

2. **HackerEarth API Key** (for code execution):
   - Visit [HackerEarth API v4](https://www.hackerearth.com/docs/wiki/developers/v4/)
   - Subscribe and get your Client Secret
   - Copy API key to `.env`

3. **Google OAuth Credentials** (optional):
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing
   - Enable Google+ API
   - Go to Credentials → Create OAuth 2.0 Client ID
   - Set authorized redirect URIs
   - Copy Client ID and Secret to `.env`

## 🏃 Running the Server

### Development Mode

```bash
# Using Python module
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 5001

# Or using the start script
python start_server.py

# Or directly
uvicorn app.main:app --reload --host 0.0.0.0 --port 5001
```

The server will start at: **http://localhost:5001**

### Production Mode

```bash
# Using uvicorn
uvicorn app.main:app --host 0.0.0.0 --port 5001 --workers 4

# Using gunicorn (recommended for production)
pip install gunicorn
gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:5001
```

### Verify Server is Running

1. **Health Check**:
   ```bash
   curl http://localhost:5001/health/
   ```

2. **API Documentation**:
   - Swagger UI: http://localhost:5001/docs
   - ReDoc: http://localhost:5001/redoc

## 📁 Project Structure

```
backend/
├── app/                      # Main application package
│   ├── api/                  # API endpoints (routers)
│   │   ├── auth.py           # Authentication endpoints
│   │   ├── users.py          # User management
│   │   ├── assessments.py    # Assessment endpoints
│   │   ├── coding.py         # Coding platform
│   │   ├── results.py        # Results & analytics
│   │   ├── teacher.py        # Teacher dashboard
│   │   ├── admin.py          # Admin dashboard
│   │   └── ...
│   ├── core/                 # Configuration and security
│   │   ├── config.py         # Application settings
│   │   └── security.py       # Security utilities
│   ├── db/                   # Database session management
│   │   └── session.py        # MongoDB connection
│   ├── models/               # Database ORM models
│   ├── schemas/              # Pydantic schemas
│   ├── services/             # Business logic
│   │   ├── gemini_coding_service.py
│   │   ├── hackerearth_execution_service.py
│   │   └── ...
│   ├── utils/                # Utility functions
│   └── main.py               # FastAPI app instance
├── requirements.txt          # Python dependencies
├── .env                      # Environment variables (create this)
├── env.example              # Environment template
├── init_database.py         # Database initialization script
├── start_server.py          # Server startup script
└── README.md                # This file
```

## 📚 API Documentation

When the server is running, access interactive API documentation:

- **Swagger UI**: http://localhost:5001/docs
  - Interactive API exploration
  - Try out endpoints directly
  - View request/response schemas

- **ReDoc**: http://localhost:5001/redoc
  - Clean, readable documentation
  - Better for reading and understanding

### Main API Endpoints

#### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user

#### Assessments
- `POST /api/teacher/assessments/create` - Create assessment
- `GET /api/assessments/student/upcoming` - Get upcoming tests
- `POST /api/assessments/{id}/submit` - Submit assessment

#### Coding Platform
- `POST /api/coding/problems/generate` - Generate AI coding problem
- `POST /api/coding/execute` - Execute code
- `POST /api/assessments/{id}/coding-submit` - Submit coding solution

For complete API documentation, visit http://localhost:5001/docs

## 🧪 Testing

### Run Tests

```bash
# Run all tests
python -m pytest

# Run with coverage
python -m pytest --cov=app --cov-report=html

# Run specific test file
python -m pytest tests/test_auth.py

# Run tests with verbose output
python -m pytest -v
```

### Manual API Testing

```bash
# Test health endpoint
python test_api.py

# Test database connection
python test_db.py

# Test assessment flow
python test_complete_flow.py
```

## 🔧 Development

### Code Quality

```bash
# Format code
black app/

# Lint code
flake8 app/

# Sort imports
isort app/
```

### Adding New Endpoints

1. Create router in `app/api/` or appropriate subdirectory
2. Import and include in `app/main.py`:
   ```python
   from app.api.your_module import router
   app.include_router(router, prefix="/api/your-module", tags=["YourModule"])
   ```
3. Add authentication if needed
4. Add validation schemas in `app/schemas/schemas.py`
5. Write tests

### Database Operations

```python
from app.db.session import get_db

# Get database instance
db = await get_db()

# Example operations
users = await db.users.find().to_list(None)
user = await db.users.find_one({"email": "user@example.com"})
result = await db.users.insert_one({"email": "new@example.com", "role": "student"})
```

## 🚀 Deployment

### Environment Variables for Production

Ensure all production environment variables are set:
- Use strong, random `SECRET_KEY`
- Set `DEBUG=false`
- Configure production MongoDB URI
- Set proper CORS origins
- Use production API keys

### Deployment Options

1. **Render**: 
   - Connect GitHub repository
   - Set environment variables
   - Build command: `pip install -r requirements.txt`
   - Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

2. **Railway**:
   - Create new project
   - Connect repository
   - Add MongoDB database
   - Set environment variables
   - Deploy

3. **Docker**:
   ```dockerfile
   FROM python:3.10-slim
   WORKDIR /app
   COPY requirements.txt .
   RUN pip install --no-cache-dir -r requirements.txt
   COPY . .
   CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
   ```

## 🆘 Troubleshooting

### Common Issues

1. **Import Errors**
   - Ensure virtual environment is activated
   - Run `pip install -r requirements.txt`
   - Check Python version: `python --version` (should be 3.8+)

2. **Database Connection Failed**
   - Verify MongoDB is running: `mongosh` or `mongo`
   - Check `MONGO_URI` in `.env`
   - For Atlas: Verify IP whitelist and credentials

3. **Port Already in Use**
   - Change port: `--port 5002`
   - Or kill existing process:
     ```bash
     # Find process
     lsof -i :5001  # macOS/Linux
     netstat -ano | findstr :5001  # Windows
     # Kill process
     kill -9 <PID>  # macOS/Linux
     taskkill /PID <PID> /F  # Windows
     ```

4. **Module Not Found**
   - Ensure you're in the backend directory
   - Activate virtual environment
   - Check `PYTHONPATH` if needed

5. **Authentication Errors**
   - Verify `SECRET_KEY` is set in `.env`
   - Check token expiration settings
   - Clear browser cookies/localStorage

6. **AI Service Errors**
   - Verify `GEMINI_API_KEY` is valid
   - Check API quota/limits
   - Ensure internet connection

7. **Code Execution Errors**
   - Verify `HACKEREARTH_CLIENT_SECRET` is set
   - Check HackerEarth API status
   - Verify API host configuration

### Debug Mode

Enable debug mode for detailed error messages:

```env
DEBUG=true
```

**Warning**: Never enable debug mode in production!

### Logs

Check application logs:
- Console output shows request/response logs
- Error logs include stack traces
- Database queries are logged in development

## 📝 Additional Resources

- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [MongoDB Documentation](https://docs.mongodb.com/)
- [Pydantic Documentation](https://docs.pydantic.dev/)
- [Uvicorn Documentation](https://www.uvicorn.org/)

## 🤝 Contributing

1. Follow Python PEP 8 style guide
2. Use type hints
3. Write docstrings
4. Add tests for new features
5. Update documentation

## 📄 License

MIT License - see LICENSE file for details

---

**EDULEARN Backend** - Powering the future of adaptive learning.
