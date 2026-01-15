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


# ============ CHAT / MESSAGING API ============

from users.models import Conversation, DirectMessage
from django.utils import timezone


class ChatParticipantSerializer(serializers.ModelSerializer):
    """Minimal user info for chat"""
    profile_image = serializers.SerializerMethodField()
    is_online = serializers.SerializerMethodField()
    last_seen = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name', 'profile_image', 'is_online', 'last_seen']
    
    def get_profile_image(self, obj):
        profile = getattr(obj, 'profile', None)
        image = getattr(profile, 'image', None)
        if not image:
            return None
        request = self.context.get('request')
        if request:
            return request.build_absolute_uri(image.url)
        return image.url
    
    def get_is_online(self, obj):
        profile = getattr(obj, 'profile', None)
        if profile:
            return profile.is_online
        return False
    
    def get_last_seen(self, obj):
        profile = getattr(obj, 'profile', None)
        if profile and profile.last_seen:
            return profile.last_seen.isoformat()
        return None


class DirectMessageSerializer(serializers.ModelSerializer):
    """Serializer for chat messages"""
    sender = ChatParticipantSerializer(read_only=True)
    
    class Meta:
        model = DirectMessage
        fields = [
            'id', 'conversation', 'sender', 'content', 'created_at', 
            'read_at', 'message_type', 'attachment_url', 'shared_post_id', 'is_unsent'
        ]
        read_only_fields = ['id', 'sender', 'created_at', 'read_at']


class ConversationSerializer(serializers.ModelSerializer):
    """Serializer for conversations"""
    participants = ChatParticipantSerializer(many=True, read_only=True)
    last_message = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Conversation
        fields = [
            'id', 'participants', 'last_message', 'unread_count', 
            'updated_at', 'is_request', 'request_status'
        ]
    
    def get_last_message(self, obj):
        last_msg = obj.get_last_message()
        if last_msg:
            return DirectMessageSerializer(last_msg, context=self.context).data
        return None
    
    def get_unread_count(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.get_unread_count(request.user)
        return 0


@api_view(['GET', 'POST'])
@permission_classes([permissions.IsAuthenticated])
def conversations_view(request):
    """
    GET: List all conversations for the current user
    POST: Start a new conversation with a user
    """
    if request.method == 'GET':
        conversations = Conversation.objects.filter(
            participants=request.user
        ).prefetch_related('participants', 'participants__profile', 'messages')
        
        serializer = ConversationSerializer(conversations, many=True, context={'request': request})
        return Response(serializer.data)
    
    elif request.method == 'POST':
        # Start a new conversation
        recipient_username = request.data.get('username')
        if not recipient_username:
            return Response({'error': 'Username is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            recipient = User.objects.get(username=recipient_username)
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
        
        if recipient == request.user:
            return Response({'error': 'Cannot message yourself'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Check if conversation already exists between these two users
        existing = Conversation.objects.filter(participants=request.user).filter(participants=recipient)
        if existing.exists():
            convo = existing.first()
            serializer = ConversationSerializer(convo, context={'request': request})
            return Response(serializer.data)
        
        # Check if recipient follows the sender (for message request logic)
        is_follower = Follow.objects.filter(follower=recipient, following=request.user).exists()
        
        # Create new conversation
        convo = Conversation.objects.create(
            is_request=not is_follower,
            request_status='pending' if not is_follower else 'accepted'
        )
        convo.participants.add(request.user, recipient)
        
        serializer = ConversationSerializer(convo, context={'request': request})
        return Response(serializer.data, status=status.HTTP_201_CREATED)


@api_view(['GET', 'POST'])
@permission_classes([permissions.IsAuthenticated])
def conversation_messages_view(request, conversation_id):
    """
    GET: Get messages in a conversation
    POST: Send a message to a conversation
    """
    try:
        conversation = Conversation.objects.get(id=conversation_id, participants=request.user)
    except Conversation.DoesNotExist:
        return Response({'error': 'Conversation not found'}, status=status.HTTP_404_NOT_FOUND)
    
    if request.method == 'GET':
        messages = conversation.messages.select_related('sender', 'sender__profile').order_by('created_at')
        
        # Mark messages as read
        unread = messages.filter(read_at__isnull=True).exclude(sender=request.user)
        unread.update(read_at=timezone.now())
        
        serializer = DirectMessageSerializer(messages, many=True, context={'request': request})
        return Response(serializer.data)
    
    elif request.method == 'POST':
        content = request.data.get('content', '').strip()
        message_type = request.data.get('message_type', 'text')
        attachment_url = request.data.get('attachment_url')
        shared_post_id = request.data.get('shared_post_id')
        
        if not content and message_type == 'text':
            return Response({'error': 'Message cannot be empty'}, status=status.HTTP_400_BAD_REQUEST)
        
        if len(content) > 5000:
            return Response({'error': 'Message too long'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Create message
        message = DirectMessage.objects.create(
            conversation=conversation,
            sender=request.user,
            content=content,
            message_type=message_type,
            attachment_url=attachment_url,
            shared_post_id=shared_post_id
        )
        
        # Update conversation timestamp
        conversation.updated_at = timezone.now()
        conversation.save(update_fields=['updated_at'])
        
        # If this was a message request, auto-accept it when recipient replies
        if conversation.is_request and conversation.request_status == 'pending':
            other_user = conversation.get_other_participant(request.user)
            # If the original recipient (not the requester) is replying, accept it
            if other_user and conversation.messages.exclude(sender=request.user).exists():
                conversation.request_status = 'accepted'
                conversation.save(update_fields=['request_status'])
        
        serializer = DirectMessageSerializer(message, context={'request': request})
        return Response(serializer.data, status=status.HTTP_201_CREATED)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def message_action_view(request, message_id):
    """Perform actions on a message (unsend, react)"""
    try:
        message = DirectMessage.objects.get(id=message_id, sender=request.user)
    except DirectMessage.DoesNotExist:
        return Response({'error': 'Message not found'}, status=status.HTTP_404_NOT_FOUND)
    
    action = request.data.get('action')
    
    if action == 'unsend':
        message.is_unsent = True
        message.content = ''  # Clear content
        message.save(update_fields=['is_unsent', 'content'])
        return Response({'detail': 'Message unsent'})
    
    return Response({'error': 'Invalid action'}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def conversation_action_view(request, conversation_id):
    """Perform actions on a conversation (accept/decline request, delete)"""
    try:
        conversation = Conversation.objects.get(id=conversation_id, participants=request.user)
    except Conversation.DoesNotExist:
        return Response({'error': 'Conversation not found'}, status=status.HTTP_404_NOT_FOUND)
    
    action = request.data.get('action')
    
    if action == 'accept':
        conversation.request_status = 'accepted'
        conversation.save(update_fields=['request_status'])
        return Response({'detail': 'Request accepted'})
    
    elif action == 'decline':
        conversation.request_status = 'declined'
        conversation.save(update_fields=['request_status'])
        return Response({'detail': 'Request declined'})
    
    elif action == 'delete':
        conversation.delete()
        return Response({'detail': 'Conversation deleted'})
    
    return Response({'error': 'Invalid action'}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def message_requests_view(request):
    """Get pending message requests"""
    requests = Conversation.objects.filter(
        participants=request.user,
        is_request=True,
        request_status='pending'
    ).prefetch_related('participants', 'participants__profile', 'messages')
    
    # Only return requests where the current user is NOT the initiator
    # (i.e., they didn't send the first message)
    result = []
    for convo in requests:
        first_message = convo.messages.order_by('created_at').first()
        if first_message and first_message.sender != request.user:
            result.append(convo)
    
    serializer = ConversationSerializer(result, many=True, context={'request': request})
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def unread_count_view(request):
    """Get total unread message count for the current user"""
    count = DirectMessage.objects.filter(
        conversation__participants=request.user,
        read_at__isnull=True
    ).exclude(sender=request.user).count()
    
    return Response({'unread_count': count})

