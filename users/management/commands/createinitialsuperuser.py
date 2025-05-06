import os
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

class Command(BaseCommand):
    help = 'Creates the initial superuser if not present'

    def handle(self, *args, **kwargs):
        User = get_user_model()
        if not User.objects.filter(username='aziztech').exists():
            superuser_password = os.getenv('SUPERUSER_PASSWORD', 'default_password')  # Default fallback
            User.objects.create_superuser('aziztech', 'azizmelzer@gmail.com', superuser_password)
            self.stdout.write(self.style.SUCCESS('Superuser created successfully'))
        else:
            self.stdout.write(self.style.WARNING('Superuser already exists'))
