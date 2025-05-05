FROM python:3.13-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
# Add any other environment variables your app needs
# ENV DJANGO_SETTINGS_MODULE=my_project.settings.production

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

# Don't run migrations during build - will run them at startup instead
# This ensures migrations run against the actual database

# Create entrypoint script for proper startup sequence
RUN echo '#!/bin/bash\n\
echo "Applying database migrations..."\n\
python manage.py makemigrations\n\
python manage.py migrate\n\
echo "Starting Gunicorn server..."\n\
exec gunicorn my_project.wsgi:application --bind 0.0.0.0:8000\n\
' > /app/entrypoint.sh

RUN chmod +x /app/entrypoint.sh

# Create a non-privileged user to run the application
RUN groupadd -r django && useradd -r -g django django
RUN chown -R django:django /app
USER django

# Set the entrypoint

CMD ["gunicorn", "my_project.wsgi:application", "--bind", "0.0.0.0:8000"]