#!/bin/bash

echo "Applying database migrations..."
python manage.py migrate

# Create superuser with environment variables (password is securely stored)
echo "Creating superuser..."
export USERNAME="azitech"
export EMAIL="azizmelzer@gmail.com"
export PASSWORD="${SUPERUSER_PASSWORD}"

# Check if the password is set
if [ -z "$SUPERUSER_PASSWORD" ]; then
  echo "Error: SUPERUSER_PASSWORD environment variable is not set."
  exit 1
fi

expect <<EOF
spawn python manage.py createsuperuser --noinput --username $USERNAME --email $EMAIL
expect "Password:"
send "$PASSWORD\r"
expect "Password (again):"
send "$PASSWORD\r"
expect eof
EOF

echo "Starting Gunicorn server..."
exec gunicorn my_project.wsgi:application --bind 0.0.0.0:8000
