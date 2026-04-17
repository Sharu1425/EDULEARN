FROM python:3.11-slim

WORKDIR /app

# Install system deps (optional but safe)
RUN apt-get update && apt-get install -y gcc

# Copy requirements
COPY requirements.txt .

# Install Python deps
RUN pip install --no-cache-dir -r requirements.txt

# Copy full backend
COPY . .

# Expose correct port
EXPOSE 5001

# Run your startup script
CMD ["python", "start_server.py"]