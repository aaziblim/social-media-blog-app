FROM python:3.13-slim

# Setting environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    gcc \
    gettext \
    && rm -rf /var/lib/apt/lists/*

# Set work directory
WORKDIR /app

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip
RUN pip install --no-cache-dir -r requirements.txt

# Copy project
COPY . /app/

# Debug step - print directory contents to verify files
RUN echo "Listing application files:" && ls -la /app/

# Collect static files
RUN python manage.py collectstatic --noinput


# Create entrypoint script for proper startup sequence
RUN echo '#!/bin/bash\n\
echo "Applying database migrations..."\n\
python manage.py makemigrations\n\
python manage.py migrate\n\
echo "Starting Gunicorn server..."\n\
exec gunicorn my_project.wsgi:application --bind 0.0.0.0:8000\n\
' > /app/entrypoint.sh

RUN chmod +x /app/entrypoint.sh

RUN groupadd -r django && useradd -r -g django django
RUN chown -R django:django /app
USER django



CMD ["sh", "-c", "python manage.py migrate && python manage.py collectstatic --noinput && gunicorn myproject.wsgi:application --bind 0.0.0.0:8000"]
