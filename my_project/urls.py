from django.contrib import admin
from django.contrib.auth import views as auth_views
from django.urls import path, include
from users import views as user_views
from django.conf import settings
from django.conf.urls.static import static
from blog import views as blog_views


from django.contrib.sites.models import Site
from django.db import IntegrityError

try:
    site, created = Site.objects.get_or_create(id=1)
    site.domain = 'my-project-latest.onrender.com'  # Replace with your actual Render domain
    site.name = 'My Project'  # Can be any name
    site.save()
except IntegrityError as e:
    print("Site already exists and couldn't be updated:", e)

urlpatterns = [
    path('admin/', admin.site.urls),
    path('register/', user_views.register, name='register'),
    path('profile/', user_views.profile, name='profile'),
     path("logout/", user_views.logout_view, name="logout"),
    path('login/', auth_views.LoginView.as_view(template_name='users/login.html'), name='login'),
    path('logout/', auth_views.LogoutView.as_view(template_name='users/logout.html'), name='logout'),
    path('post/<int:pk>/like/', user_views.LikeView, name='post-like'),
     path('post/<int:pk>/dislike/', user_views.DislikeView, name='post-dislike'),
    path('', include('blog.urls')),  # This will route "/" and "/about/" as defined in blog.urls.
    path('accounts/', include('allauth.urls'))
]

if settings.DEBUG:
 urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)


