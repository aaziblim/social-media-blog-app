FROM python:3.13-slim

# Environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    expect \
    libpq-dev \
    gcc \
    gettext \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip
RUN pip install --no-cache-dir -r requirements.txt


COPY media /app/media/
# Copy project files
COPY . /app/



# Copy entrypoint script
COPY entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

# Collect static files
RUN python manage.py collectstatic --noinput

# Set permissions and user
RUN groupadd -r django && useradd -r -g django django
RUN chown -R django:django /app
USER django

# Run entrypoint script
ENTRYPOINT ["/app/entrypoint.sh"]
