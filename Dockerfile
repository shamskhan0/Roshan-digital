FROM python:3.10-slim

# Install PHP
RUN apt-get update && apt-get install -y \
    php php-mysql php-pdo php-mbstring php-xml php-curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy backend files
COPY backend/ ./backend/

# Copy frontend build
COPY frontend/dist/ ./frontend/dist/

EXPOSE 5000

CMD ["php", "-S", "0.0.0.0:5000", "-t", "frontend/dist", "backend/router.php"]
