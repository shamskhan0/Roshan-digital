FROM python:3.10-slim

WORKDIR /app

# Install backend requirements
COPY backend/requirements.txt ./backend/requirements.txt

RUN pip install --no-cache-dir -r backend/requirements.txt

# Copy backend
COPY backend ./backend

# Copy frontend
COPY frontend ./frontend

# Install node for React build
RUN apt-get update && apt-get install -y nodejs npm && rm -rf /var/lib/apt/lists/*

WORKDIR /app/frontend

RUN npm install
RUN npm run build

WORKDIR /app

EXPOSE 5000

CMD ["python", "backend/app.py"]
