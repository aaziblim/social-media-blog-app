#!/bin/bash
set -e

echo "Applying database migrations..."
python manage.py migrate

python manage.py createinitialsuperuser


echo "Starting Gunicorn server..."
exec gunicorn my_project.wsgi:application --bind 0.0.0.0:8000
