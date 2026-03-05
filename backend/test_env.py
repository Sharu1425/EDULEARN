import os
from dotenv import load_dotenv

print("Before load:", os.getenv("GEMINI_API_KEY"))
# Force reload the .env file and override system environment variables
load_dotenv(override=True)
print("After load:", os.getenv("GEMINI_API_KEY"))

from app.core.config import settings
print("Settings load:", settings.gemini_api_key)
