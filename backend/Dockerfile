# ── EDULEARN Backend Dockerfile ───────────────────────────────────────────────
# For local Docker run or HuggingFace Spaces deployment

FROM python:3.11-slim

WORKDIR /app

# Install system dependencies (needed for PyMuPDF, python-magic, etc.)
RUN apt-get update && apt-get install -y \
    libmagic1 \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies first (layer caching)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Expose backend port
EXPOSE 5001

# Run with uvicorn — host 0.0.0.0 required for Docker networking
CMD ["python", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "5001", "--workers", "1"]
