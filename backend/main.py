"""
FastAPI Application Entry Point
This is the main entry point for the FastAPI application.
Run this from the backend directory to start the server.
"""
import sys
import os

# Load environment variables FIRST before any other imports
from dotenv import load_dotenv

# Load .env file - must be called before importing any modules that use environment variables
load_dotenv()

# Debug: Print HackerEarth secret to verify it's loaded (remove in production)
client_secret = os.getenv("HACKEREARTH_CLIENT_SECRET")
print(f"DEBUG SECRET: {'Set' if client_secret else 'Not set'}")
if client_secret:
    print(f"DEBUG SECRET (first 10 chars): {client_secret[:10]}...")

# Add the current directory to Python path to resolve imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import uvicorn

if __name__ == "__main__":
    print("Starting FastAPI server...")
    print("Server will be available at: http://0.0.0.0:5001")
    print("API documentation at: http://0.0.0.0:5001/docs")
    print("Press Ctrl+C to stop the server")
    
    port = int(os.environ.get("PORT", 5001))
    
    # Disable reload in production
    is_prod = os.environ.get("RENDER") == "true" or os.environ.get("ENV") == "production"
    
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=port,
        reload=not is_prod,
        log_level="info"
    )
