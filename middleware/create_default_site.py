from django.contrib.sites.models import Site
from django.db.utils import OperationalError, ProgrammingError

class EnsureSiteMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response
        self.has_run = False

    def __call__(self, request):
        if not self.has_run:
            try:
                Site.objects.get_or_create(
                    id=1,
                    defaults={
                        "domain": "my-project-latest.onrender.com",  # <- update to match your domain
                        "name": "My Project"
                    }
                )
                self.has_run = True
            except (OperationalError, ProgrammingError):
                # DB might not be ready (e.g. during initial migration)
                pass

        return self.get_response(request)
