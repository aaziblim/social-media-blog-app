from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User
from rest_framework import status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework import serializers
from users.models import Profile, Follow
from django.db.models import Count, Q


class ProfileSerializer(serializers.ModelSerializer):
    image = serializers.SerializerMethodField()

    class Meta:
        model = Profile
        fields = ['image', 'bio']

    def get_image(self, obj):
        if not obj.image:
            return None
        request = self.context.get("request")
        if request:
            return request.build_absolute_uri(obj.image.url)
        return obj.image.url


class UserSerializer(serializers.ModelSerializer):
    profile = ProfileSerializer(read_only=True)

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'profile']
        read_only_fields = ['id', 'username']

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Pass request context to nested serializer
        if 'context' in kwargs:
            self.fields['profile'].context.update(kwargs['context'])


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=6)

    class Meta:
        model = User
        fields = ['username', 'email', 'password']

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data.get('email', ''),
            password=validated_data['password'],
        )
        return user


@api_view(['GET', 'PATCH'])
@permission_classes([permissions.IsAuthenticated])
def user_view(request):
    """Get or update the current user."""
    if request.method == 'GET':
        serializer = UserSerializer(request.user, context={'request': request})
        return Response(serializer.data)

    elif request.method == 'PATCH':
        user = request.user
        # Update user fields
        if 'first_name' in request.data:
            user.first_name = request.data['first_name']
        if 'last_name' in request.data:
            user.last_name = request.data['last_name']
        if 'email' in request.data:
            user.email = request.data['email']
        user.save()

        # Update profile fields
        profile = user.profile
        if 'bio' in request.data:
            profile.bio = request.data['bio']
        if 'image' in request.FILES:
            profile.image = request.FILES['image']
        profile.save()

        serializer = UserSerializer(user, context={'request': request})
        return Response(serializer.data)


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def login_view(request):
    """Log in a user."""
    username = request.data.get('username')
    password = request.data.get('password')

    if not username or not password:
        return Response(
            {'detail': 'Username and password are required.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    user = authenticate(request, username=username, password=password)
    if user is None:
        return Response(
            {'detail': 'Invalid credentials.'},
            status=status.HTTP_401_UNAUTHORIZED
        )

    login(request, user)
    serializer = UserSerializer(user, context={'request': request})
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def logout_view(request):
    """Log out the current user."""
    logout(request)
    return Response({'detail': 'Logged out.'})


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def register_view(request):
    """Register a new user."""
    serializer = RegisterSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.save()
        login(request, user)
        return Response(UserSerializer(user, context={'request': request}).data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class UserProfileSerializer(serializers.ModelSerializer):
    profile_image = serializers.SerializerMethodField()
    bio = serializers.SerializerMethodField()
    posts_count = serializers.SerializerMethodField()
    followers_count = serializers.SerializerMethodField()
    following_count = serializers.SerializerMethodField()
    posts = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name', 'profile_image', 'bio', 'posts_count', 'followers_count', 'following_count', 'posts']

    def get_profile_image(self, obj):
        profile = getattr(obj, 'profile', None)
        image = getattr(profile, 'image', None)
        if not image:
            return None
        request = self.context.get('request')
        if request:
            return request.build_absolute_uri(image.url)
        return image.url

    def get_bio(self, obj):
        profile = getattr(obj, 'profile', None)
        return getattr(profile, 'bio', '') or ''

    def get_posts_count(self, obj):
        return obj.post_set.count()

    def get_followers_count(self, obj):
        return obj.followers.count()

    def get_following_count(self, obj):
        return obj.following.count()

    def get_posts(self, obj):
        from blog.api import PostSerializer
        posts = obj.post_set.order_by('-date_posted')[:12]
        return PostSerializer(posts, many=True, context=self.context).data


@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def user_profile_view(request, username):
    """Get a user's public profile."""
    try:
        user = User.objects.select_related('profile').get(username=username)
    except User.DoesNotExist:
        return Response({'detail': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)
    
    serializer = UserProfileSerializer(user, context={'request': request})
    data = serializer.data
    
    # Add is_following field if user is authenticated
    if request.user.is_authenticated and request.user != user:
        data['is_following'] = Follow.objects.filter(
            follower=request.user,
            following=user
        ).exists()
    else:
        data['is_following'] = False
    
    return Response(data)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def follow_user_view(request, username):
    """Follow a user."""
    try:
        user_to_follow = User.objects.get(username=username)
    except User.DoesNotExist:
        return Response({'detail': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)
    
    if request.user == user_to_follow:
        return Response({'detail': 'You cannot follow yourself.'}, status=status.HTTP_400_BAD_REQUEST)
    
    follow, created = Follow.objects.get_or_create(
        follower=request.user,
        following=user_to_follow
    )
    
    if created:
        return Response({
            'detail': f'Now following {username}.',
            'is_following': True,
            'followers_count': user_to_follow.followers.count()
        })
    else:
        return Response({
            'detail': f'Already following {username}.',
            'is_following': True,
            'followers_count': user_to_follow.followers.count()
        })


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def unfollow_user_view(request, username):
    """Unfollow a user."""
    try:
        user_to_unfollow = User.objects.get(username=username)
    except User.DoesNotExist:
        return Response({'detail': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)
    
    deleted, _ = Follow.objects.filter(
        follower=request.user,
        following=user_to_unfollow
    ).delete()
    
    return Response({
        'detail': f'Unfollowed {username}.' if deleted else f'Was not following {username}.',
        'is_following': False,
        'followers_count': user_to_unfollow.followers.count()
    })


class SuggestionUserSerializer(serializers.ModelSerializer):
    profile_image = serializers.SerializerMethodField()
    followers_count = serializers.SerializerMethodField()
    bio = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name', 'profile_image', 'followers_count', 'bio']

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
        return obj.followers.count()
    
    def get_bio(self, obj):
        profile = getattr(obj, 'profile', None)
        return getattr(profile, 'bio', '') or ''


@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def suggested_users_view(request):
    """Get suggested users to follow."""
    # Get users with most followers, excluding the current user
    users = User.objects.select_related('profile').annotate(
        follower_count=Count('followers')
    ).order_by('-follower_count')
    
    if request.user.is_authenticated:
        # Exclude current user and users already followed
        following_ids = Follow.objects.filter(follower=request.user).values_list('following_id', flat=True)
        users = users.exclude(id=request.user.id).exclude(id__in=following_ids)
    
    users = users[:5]  # Limit to 5 suggestions
    
    serializer = SuggestionUserSerializer(users, many=True, context={'request': request})
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def user_stats_view(request):
    """Get current user's stats for sidebar."""
    user = request.user
    
    # Calculate karma (sum of likes - dislikes across all posts)
    from blog.models import Post
    user_posts = Post.objects.filter(author=user)
    total_likes = sum(post.total_likes for post in user_posts)
    total_dislikes = sum(post.total_dislikes for post in user_posts)
    karma = total_likes - total_dislikes
    
    # Get profile image
    profile_image = None
    if hasattr(user, 'profile') and user.profile.image:
        profile_image = request.build_absolute_uri(user.profile.image.url)
    
    return Response({
        'username': user.username,
        'profile_image': profile_image,
        'posts_count': user_posts.count(),
        'karma': karma,
        'followers_count': user.followers.count(),
        'following_count': user.following.count(),
    })


@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def explore_users_view(request):
    """Get all users for the explore page."""
    # Get all users ordered by follower count
    users = User.objects.select_related('profile').annotate(
        follower_count=Count('followers')
    ).order_by('-follower_count')
    
    if request.user.is_authenticated:
        # Exclude current user
        users = users.exclude(id=request.user.id)
    
    users = users[:20]  # Limit to 20 users
    
    serializer = SuggestionUserSerializer(users, many=True, context={'request': request})
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def following_list_view(request):
    """Get list of users the current user is following."""
    following = Follow.objects.filter(follower=request.user).select_related('following', 'following__profile')
    users = [f.following for f in following]
    serializer = SuggestionUserSerializer(users, many=True, context={'request': request})
    return Response(serializer.data)
