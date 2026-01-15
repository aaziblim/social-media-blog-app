from django.contrib import admin
from django.contrib.auth import views as auth_views
from django.urls import path, include
from users import views as user_views
from users import api as users_api
from django.conf import settings
from django.conf.urls.static import static
from blog import views as blog_views
from blog.api import PostViewSet, CommentViewSet, LivestreamViewSet
from rest_framework.routers import DefaultRouter
from django.views.decorators.csrf import ensure_csrf_cookie
from django.http import JsonResponse


from django.contrib.sites.models import Site
from django.db import IntegrityError

try:
    site, created = Site.objects.get_or_create(id=1)
    site.domain = 'my-project-latest.onrender.com'  # Replace with your actual Render domain
    site.name = 'My Project'  # Can be any name
    site.save()
except IntegrityError as e:
    print("Site already exists and couldn't be updated:", e)

router = DefaultRouter()
router.register(r'posts', PostViewSet, basename='post')
router.register(r'comments', CommentViewSet, basename='comment')
router.register(r'streams', LivestreamViewSet, basename='stream')


@ensure_csrf_cookie
def csrf_view(request):
    return JsonResponse({'detail': 'ok'})

urlpatterns = [
    path('admin/', admin.site.urls),
    path('register/', user_views.register, name='register'),
    path('profile/', user_views.profile, name='profile'),
     path("logout/", user_views.logout_view, name="logout"),
    path('login/', auth_views.LoginView.as_view(template_name='users/login.html'), name='login'),
    path('logout/', auth_views.LogoutView.as_view(template_name='users/logout.html'), name='logout'),
    path('post/<int:pk>/like/', user_views.LikeView, name='post-like'),
     path('post/<int:pk>/dislike/', user_views.DislikeView, name='post-dislike'),
    path('api/csrf/', csrf_view, name='api-csrf'),
    path('api/auth/user/', users_api.user_view, name='api-user'),
    path('api/auth/login/', users_api.login_view, name='api-login'),
    path('api/auth/logout/', users_api.logout_view, name='api-logout'),
    path('api/auth/register/', users_api.register_view, name='api-register'),
    path('api/users/following/', users_api.following_list_view, name='api-following-list'),
    path('api/users/<str:username>/', users_api.user_profile_view, name='api-user-profile'),
    path('api/users/<str:username>/follow/', users_api.follow_user_view, name='api-follow-user'),
    path('api/users/<str:username>/unfollow/', users_api.unfollow_user_view, name='api-unfollow-user'),
    path('api/suggestions/', users_api.suggested_users_view, name='api-suggestions'),
    path('api/explore/', users_api.explore_users_view, name='api-explore'),
    path('api/stats/', users_api.user_stats_view, name='api-user-stats'),
    # Chat / Messaging API
    path('api/conversations/', users_api.conversations_view, name='api-conversations'),
    path('api/conversations/<uuid:conversation_id>/messages/', users_api.conversation_messages_view, name='api-conversation-messages'),
    path('api/conversations/<uuid:conversation_id>/action/', users_api.conversation_action_view, name='api-conversation-action'),
    path('api/messages/<uuid:message_id>/action/', users_api.message_action_view, name='api-message-action'),
    path('api/message-requests/', users_api.message_requests_view, name='api-message-requests'),
    path('api/unread-count/', users_api.unread_count_view, name='api-unread-count'),
    path('api/', include(router.urls)),
    path('', include('blog.urls')),  # This will route "/" and "/about/" as defined in blog.urls.
    path('accounts/', include('allauth.urls'))
]

if settings.DEBUG:
 urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)


