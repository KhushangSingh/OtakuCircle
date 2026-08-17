FROM python:3.9-slim
WORKDIR /app

# Install dependencies (cache-bust: 2026-08-17)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application files
COPY . .

# Expose port 8000
EXPOSE 8000

# Run the Waitress production server (from main.py)
CMD ["python", "main.py"]
