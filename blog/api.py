from django.db import models
from django.db.models import Count
from rest_framework import viewsets, permissions, decorators, status
from rest_framework.response import Response
from rest_framework import serializers
from rest_framework.pagination import PageNumberPagination
from .models import Post, Comment, Livestream, LivestreamMessage, LivestreamSignal
from django.contrib.auth.models import User
from django.utils import timezone


class AuthorSerializer(serializers.ModelSerializer):
    profile_image = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ["id", "username", "first_name", "last_name", "profile_image"]

    def get_profile_image(self, obj):
        profile = getattr(obj, "profile", None)
        image = getattr(profile, "image", None)
        if not image:
            return None
        request = self.context.get("request")
        if request:
            return request.build_absolute_uri(image.url)
        return image.url


class PostSerializer(serializers.ModelSerializer):
    author = AuthorSerializer(read_only=True)
    likes_count = serializers.IntegerField(read_only=True)
    dislikes_count = serializers.IntegerField(read_only=True)
    comments_count = serializers.IntegerField(read_only=True)
    user_has_liked = serializers.SerializerMethodField()
    user_has_disliked = serializers.SerializerMethodField()
    # Read-only fields that return absolute URLs
    post_image_url = serializers.SerializerMethodField()
    post_video_url = serializers.SerializerMethodField()
    # Write-only fields for file uploads
    post_image = serializers.ImageField(write_only=True, required=False, allow_null=True)
    post_video = serializers.FileField(write_only=True, required=False, allow_null=True)

    class Meta:
        model = Post
        fields = [
            "id",
            "public_id",
            "slug",
            "title",
            "content",
            "post_image",
            "post_video",
            "post_image_url",
            "post_video_url",
            "date_posted",
            "author",
            "likes_count",
            "dislikes_count",
            "comments_count",
            "user_has_liked",
            "user_has_disliked",
        ]
        # Keep identifiers and derived URLs server-controlled to avoid collisions.
        read_only_fields = [
            "id",
            "public_id",
            "slug",
            "author",
            "likes_count",
            "dislikes_count",
            "comments_count",
            "user_has_liked",
            "user_has_disliked",
            "post_image_url",
            "post_video_url",
        ]

    def get_post_image_url(self, obj):
        if not obj.post_image:
            return None
        request = self.context.get("request")
        if request:
            return request.build_absolute_uri(obj.post_image.url)
        return obj.post_image.url

    def get_post_video_url(self, obj):
        if not obj.post_video:
            return None
        request = self.context.get("request")
        if request:
            return request.build_absolute_uri(obj.post_video.url)
        return obj.post_video.url

    def get_user_has_liked(self, obj):
        request = self.context.get("request")
        user = getattr(request, "user", None)
        if not user or not user.is_authenticated:
            return False
        return obj.likes.filter(pk=user.pk).exists()

    def get_user_has_disliked(self, obj):
        request = self.context.get("request")
        user = getattr(request, "user", None)
        if not user or not user.is_authenticated:
            return False
        return obj.dislikes.filter(pk=user.pk).exists()


class PostViewSet(viewsets.ModelViewSet):
    serializer_class = PostSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    lookup_field = "slug"
    # Use global DRF pagination defined in settings (PageNumberPagination, size 6).

    def get_queryset(self):
        return (
            Post.objects.all()
            .select_related("author", "author__profile")
            .prefetch_related("likes", "dislikes")
            .annotate(
                likes_count=Count("likes", distinct=True),
                dislikes_count=Count("dislikes", distinct=True),
                comments_count=Count("comments", distinct=True),
            )
            .order_by("-date_posted")
        )

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)

    def get_object(self):
        lookup_value = self.kwargs.get(self.lookup_field)
        queryset = self.get_queryset()
        # Try slug
        obj = queryset.filter(slug=lookup_value).first()
        if obj:
            return obj
        # Try public_id
        try:
            obj = queryset.filter(public_id=lookup_value).first()
            if obj:
                return obj
        except Exception:
            pass
        # Fallback to numeric ID
        try:
            obj = queryset.filter(pk=int(lookup_value)).first()
            if obj:
                return obj
        except Exception:
            pass
        from django.http import Http404
        raise Http404("Post not found")

    def _annotated_instance(self, post):
        # Re-fetch the post with annotations so counts are accurate after mutations.
        return (
            self.get_queryset()
            .filter(pk=post.pk)
            .first()
        )

    @decorators.action(detail=True, methods=["post"], permission_classes=[permissions.IsAuthenticated])
    def like(self, request, pk=None):
        post = self.get_object()
        user = request.user
        if post.likes.filter(pk=user.pk).exists():
            post.likes.remove(user)
        else:
            post.dislikes.remove(user)
            post.likes.add(user)

        refreshed = self._annotated_instance(post)
        serializer = self.get_serializer(refreshed)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @decorators.action(detail=True, methods=["post"], permission_classes=[permissions.IsAuthenticated])
    def dislike(self, request, pk=None):
        post = self.get_object()
        user = request.user
        if post.dislikes.filter(pk=user.pk).exists():
            post.dislikes.remove(user)
        else:
            post.likes.remove(user)
            post.dislikes.add(user)

        refreshed = self._annotated_instance(post)
        serializer = self.get_serializer(refreshed)
        return Response(serializer.data, status=status.HTTP_200_OK)


# ==================== COMMENTS ====================

class CommentSerializer(serializers.ModelSerializer):
    author = AuthorSerializer(read_only=True)
    likes_count = serializers.IntegerField(read_only=True)
    dislikes_count = serializers.IntegerField(read_only=True)
    replies_count = serializers.IntegerField(read_only=True)
    user_has_liked = serializers.SerializerMethodField()
    user_has_disliked = serializers.SerializerMethodField()
    replies = serializers.SerializerMethodField()

    class Meta:
        model = Comment
        fields = [
            "id",
            "post",
            "parent",
            "content",
            "created_at",
            "updated_at",
            "author",
            "likes_count",
            "dislikes_count",
            "replies_count",
            "user_has_liked",
            "user_has_disliked",
            "replies",
        ]
        read_only_fields = ["author", "likes_count", "dislikes_count", "replies_count", "user_has_liked", "user_has_disliked"]

    def get_user_has_liked(self, obj):
        request = self.context.get("request")
        user = getattr(request, "user", None)
        if not user or not user.is_authenticated:
            return False
        return obj.likes.filter(pk=user.pk).exists()

    def get_user_has_disliked(self, obj):
        request = self.context.get("request")
        user = getattr(request, "user", None)
        if not user or not user.is_authenticated:
            return False
        return obj.dislikes.filter(pk=user.pk).exists()

    def get_replies(self, obj):
        # Only include replies for top-level comments (no parent)
        if obj.parent is not None:
            return []
        replies = (
            Comment.objects.filter(parent=obj)
            .select_related("author", "author__profile")
            .prefetch_related("likes", "dislikes")
            .annotate(
                likes_count=Count("likes", distinct=True),
                dislikes_count=Count("dislikes", distinct=True),
                replies_count=Count("replies", distinct=True),
            )
            .order_by("created_at")
        )
        return CommentSerializer(replies, many=True, context=self.context).data


class CommentViewSet(viewsets.ModelViewSet):
    serializer_class = CommentSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    pagination_class = None  # Disable pagination for comments

    def get_queryset(self):
        queryset = (
            Comment.objects.all()
            .select_related("author", "author__profile")
            .prefetch_related("likes", "dislikes")
            .annotate(
                likes_count=Count("likes", distinct=True),
                dislikes_count=Count("dislikes", distinct=True),
                replies_count=Count("replies", distinct=True),
            )
        )
        
        # Filter by post if specified
        post_id = self.request.query_params.get("post")
        if post_id:
            queryset = queryset.filter(post_id=post_id, parent__isnull=True)
        
        return queryset.order_by("-created_at")

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)

    def _annotated_instance(self, comment):
        return (
            self.get_queryset()
            .filter(pk=comment.pk)
            .first()
        )

    @decorators.action(detail=True, methods=["post"], permission_classes=[permissions.IsAuthenticated])
    def like(self, request, pk=None):
        comment = self.get_object()
        user = request.user
        if comment.likes.filter(pk=user.pk).exists():
            comment.likes.remove(user)
        else:
            comment.dislikes.remove(user)
            comment.likes.add(user)

        refreshed = self._annotated_instance(comment)
        serializer = self.get_serializer(refreshed)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @decorators.action(detail=True, methods=["post"], permission_classes=[permissions.IsAuthenticated])
    def dislike(self, request, pk=None):
        comment = self.get_object()
        user = request.user
        if comment.dislikes.filter(pk=user.pk).exists():
            comment.dislikes.remove(user)
        else:
            comment.likes.remove(user)
            comment.dislikes.add(user)

        refreshed = self._annotated_instance(comment)
        serializer = self.get_serializer(refreshed)
        return Response(serializer.data, status=status.HTTP_200_OK)


# ============ LIVESTREAM API ============

class LivestreamHostSerializer(serializers.ModelSerializer):
    """Minimal host info for stream cards"""
    profile_image = serializers.SerializerMethodField()
    followers_count = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name', 'profile_image', 'followers_count']
    
    def get_profile_image(self, obj):
        profile = getattr(obj, 'profile', None)
        image = getattr(profile, 'image', None)
        if not image:
            return None
        request = self.context.get('request')
        if request:
            return request.build_absolute_uri(image.url)
        return image.url
    
    def get_followers_count(self, obj):
        from users.models import Follow
        return Follow.objects.filter(following=obj).count()


class LivestreamMessageSerializer(serializers.ModelSerializer):
    author = LivestreamHostSerializer(read_only=True)
    
    class Meta:
        model = LivestreamMessage
        fields = ['id', 'author', 'content', 'created_at', 'is_pinned']
        read_only_fields = ['id', 'author', 'created_at']


class LivestreamSignalSerializer(serializers.ModelSerializer):
    class Meta:
        model = LivestreamSignal
        fields = ['id', 'role', 'kind', 'payload', 'created_at']
        read_only_fields = ['id', 'created_at']


class LivestreamSerializer(serializers.ModelSerializer):
    host = LivestreamHostSerializer(read_only=True)
    thumbnail_url = serializers.SerializerMethodField()
    duration = serializers.ReadOnlyField()
    is_live = serializers.ReadOnlyField()
    
    class Meta:
        model = Livestream
        fields = [
            'id', 'host', 'title', 'description', 'thumbnail_url',
            'status', 'viewer_count', 'peak_viewers', 'total_likes',
            'scheduled_at', 'started_at', 'ended_at', 'created_at',
            'is_private', 'duration', 'is_live'
        ]
        read_only_fields = ['id', 'host', 'viewer_count', 'peak_viewers', 'total_likes', 'started_at', 'ended_at']
    
    def get_thumbnail_url(self, obj):
        if not obj.thumbnail:
            return None
        request = self.context.get('request')
        if request:
            return request.build_absolute_uri(obj.thumbnail.url)
        return obj.thumbnail.url


class LivestreamViewSet(viewsets.ModelViewSet):
    """
    Livestream API - Simple, beautiful, magical.
    
    list: Get all live/scheduled streams
    create: Start a new stream (authenticated)
    retrieve: Get stream details
    """
    serializer_class = LivestreamSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    lookup_field = 'id'
    
    def get_queryset(self):
        queryset = Livestream.objects.select_related('host', 'host__profile')
        
        # Filter by status
        status_filter = self.request.query_params.get('status')
        if status_filter == 'live':
            queryset = queryset.filter(status='live')
        elif status_filter == 'scheduled':
            queryset = queryset.filter(status='scheduled', scheduled_at__gte=timezone.now())
        elif status_filter != 'all':
            # Default: show live and recent ended (last 24h)
            queryset = queryset.filter(
                models.Q(status='live') | 
                models.Q(status='scheduled') |
                models.Q(status='ended', ended_at__gte=timezone.now() - timezone.timedelta(hours=24))
            )
        
        # Order: live first, then scheduled, then ended
        return queryset.order_by(
            models.Case(
                models.When(status='live', then=0),
                models.When(status='scheduled', then=1),
                default=2,
                output_field=models.IntegerField()
            ),
            '-viewer_count',
            '-created_at'
        )
    
    def perform_create(self, serializer):
        serializer.save(host=self.request.user)
    
    @decorators.action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def go_live(self, request, id=None):
        """One tap to go live - magic ✨"""
        stream = self.get_object()
        if stream.host != request.user:
            return Response({'error': 'Only the host can start the stream'}, status=status.HTTP_403_FORBIDDEN)
        if stream.status == 'live':
            return Response({'error': 'Stream is already live'}, status=status.HTTP_400_BAD_REQUEST)
        if stream.status == 'ended':
            return Response({'error': 'Stream has ended'}, status=status.HTTP_400_BAD_REQUEST)
        
        stream.start()
        return Response(self.get_serializer(stream).data)
    
    @decorators.action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def end_stream(self, request, id=None):
        """End the stream gracefully"""
        stream = self.get_object()
        if stream.host != request.user:
            return Response({'error': 'Only the host can end the stream'}, status=status.HTTP_403_FORBIDDEN)
        if stream.status != 'live':
            return Response({'error': 'Stream is not live'}, status=status.HTTP_400_BAD_REQUEST)
        
        stream.end()
        return Response(self.get_serializer(stream).data)
    
    @decorators.action(detail=True, methods=['post'])
    def join(self, request, id=None):
        """Viewer joins the stream"""
        stream = self.get_object()
        if stream.status != 'live':
            return Response({'error': 'Stream is not live'}, status=status.HTTP_400_BAD_REQUEST)
        
        stream.viewer_count = models.F('viewer_count') + 1
        stream.save()
        stream.refresh_from_db()
        
        # Update peak viewers
        if stream.viewer_count > stream.peak_viewers:
            stream.peak_viewers = stream.viewer_count
            stream.save()
        
        return Response(self.get_serializer(stream).data)
    
    @decorators.action(detail=True, methods=['post'])
    def leave(self, request, id=None):
        """Viewer leaves the stream"""
        stream = self.get_object()
        if stream.viewer_count > 0:
            stream.viewer_count = models.F('viewer_count') - 1
            stream.save()
            stream.refresh_from_db()
        return Response(self.get_serializer(stream).data)
    
    @decorators.action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def like(self, request, id=None):
        """Send a like/heart during stream"""
        stream = self.get_object()
        if stream.status != 'live':
            return Response({'error': 'Stream is not live'}, status=status.HTTP_400_BAD_REQUEST)
        
        stream.total_likes = models.F('total_likes') + 1
        stream.save()
        stream.refresh_from_db()
        return Response({'total_likes': stream.total_likes})
    
    @decorators.action(detail=True, methods=['get', 'post'])
    def messages(self, request, id=None):
        """Get or send chat messages"""
        stream = self.get_object()
        
        if request.method == 'GET':
            # Get recent messages (last 100)
            messages = stream.messages.select_related('author', 'author__profile').order_by('-created_at')[:100]
            return Response(LivestreamMessageSerializer(reversed(list(messages)), many=True, context={'request': request}).data)
        
        # POST - send message
        if not request.user.is_authenticated:
            return Response({'error': 'Login required'}, status=status.HTTP_401_UNAUTHORIZED)
        if stream.status != 'live':
            return Response({'error': 'Stream is not live'}, status=status.HTTP_400_BAD_REQUEST)
        
        content = request.data.get('content', '').strip()
        if not content:
            return Response({'error': 'Message cannot be empty'}, status=status.HTTP_400_BAD_REQUEST)
        if len(content) > 500:
            return Response({'error': 'Message too long'}, status=status.HTTP_400_BAD_REQUEST)
        
        message = LivestreamMessage.objects.create(
            stream=stream,
            author=request.user,
            content=content
        )
        return Response(LivestreamMessageSerializer(message, context={'request': request}).data, status=status.HTTP_201_CREATED)

    @decorators.action(detail=True, methods=['get', 'post'])
    def signals(self, request, id=None):
        """Lightweight signaling channel for WebRTC (offer/answer/candidates)"""
        stream = self.get_object()

        if request.method == 'GET':
            qs = stream.signals.order_by('created_at')
            since = request.query_params.get('since')
            if since:
                try:
                    since_dt = timezone.datetime.fromtimestamp(float(since), tz=timezone.utc)
                    qs = qs.filter(created_at__gt=since_dt)
                except Exception:
                    pass
            return Response(LivestreamSignalSerializer(qs, many=True).data)

        # POST
        role = request.data.get('role')
        kind = request.data.get('kind')
        payload = request.data.get('payload')
        if role not in ['host', 'viewer'] or kind not in ['offer', 'answer', 'candidate']:
            return Response({'error': 'Invalid role or kind'}, status=status.HTTP_400_BAD_REQUEST)
        if payload is None:
            return Response({'error': 'Missing payload'}, status=status.HTTP_400_BAD_REQUEST)
        signal = LivestreamSignal.objects.create(stream=stream, role=role, kind=kind, payload=payload)
        # Keep table small: prune old signals per stream
        excess = stream.signals.order_by('-created_at')[100:]
        if excess:
            stream.signals.filter(id__in=[s.id for s in excess]).delete()
        return Response(LivestreamSignalSerializer(signal).data, status=status.HTTP_201_CREATED)
