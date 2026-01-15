from django.db import models
from django.contrib.auth.models import User
from django.urls import reverse
from PIL import Image
from io import BytesIO
from django.core.files.base import ContentFile
from django.utils import timezone
import uuid


class Follow(models.Model):
    """Model to track user follow relationships."""
    follower = models.ForeignKey(User, on_delete=models.CASCADE, related_name='following')
    following = models.ForeignKey(User, on_delete=models.CASCADE, related_name='followers')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('follower', 'following')
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.follower.username} follows {self.following.username}'


class Profile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    image = models.ImageField(default='https://res.cloudinary.com/dacomxwpr/image/upload/v1747636912/default_i7zros.jpg', upload_to='profile_pics')
    bio = models.TextField(blank=True, default='')
    last_seen = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f'{self.user.username} Profile'

    @property
    def is_online(self):
        """User is considered online if active in the last 45 seconds."""
        if not self.last_seen:
            return False
        return (timezone.now() - self.last_seen).total_seconds() < 45

    def get_absolute_url(self):
        return reverse('post-detail', kwargs={'pk': self.pk})

    def save(self, *args, **kwargs):
        # Save first to get access to self.image.file
        super().save(*args, **kwargs)

        if self.image:
            try:
                # Open image from file-like object (works with S3)
                img = Image.open(self.image)

                if img.height > 300 or img.width > 300:
                    output_size = (300, 300)
                    img.thumbnail(output_size)

                    buffer = BytesIO()
                    img.save(buffer, format='JPEG')
                    buffer.seek(0)

                    # Overwrite original image with resized one
                    self.image.save(self.image.name, ContentFile(buffer.read()), save=False)
                    buffer.close()

                    # Save again with resized image
                    super().save(*args, **kwargs)

            except Exception as e:
                print(f"Image resizing failed: {e}")


# ============ CHAT / MESSAGING MODELS ============

class Conversation(models.Model):
    """A conversation between two or more users"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    participants = models.ManyToManyField(User, related_name='conversations')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # For message requests from non-followers
    is_request = models.BooleanField(default=False)
    request_status = models.CharField(
        max_length=20, 
        choices=[('pending', 'Pending'), ('accepted', 'Accepted'), ('declined', 'Declined')],
        default='accepted'
    )
    
    class Meta:
        ordering = ['-updated_at']
    
    def __str__(self):
        usernames = ', '.join([u.username for u in self.participants.all()[:3]])
        return f"Conversation: {usernames}"
    
    def get_other_participant(self, user):
        """Get the other user in a 2-person conversation"""
        return self.participants.exclude(id=user.id).first()
    
    def get_last_message(self):
        """Get the most recent message"""
        return self.messages.order_by('-created_at').first()
    
    def get_unread_count(self, user):
        """Count unread messages for a user"""
        return self.messages.filter(read_at__isnull=True).exclude(sender=user).count()


class DirectMessage(models.Model):
    """A message within a conversation"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE, related_name='messages')
    sender = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sent_messages')
    content = models.TextField(max_length=5000)
    created_at = models.DateTimeField(auto_now_add=True)
    read_at = models.DateTimeField(null=True, blank=True)
    
    # Message types
    MESSAGE_TYPES = [
        ('text', 'Text'),
        ('image', 'Image'),
        ('post_share', 'Post Share'),
        ('voice', 'Voice'),
    ]
    message_type = models.CharField(max_length=20, choices=MESSAGE_TYPES, default='text')
    attachment_url = models.URLField(max_length=500, null=True, blank=True)
    shared_post_id = models.CharField(max_length=50, null=True, blank=True)
    
    # Soft delete for "unsend"
    is_unsent = models.BooleanField(default=False)
    
    class Meta:
        ordering = ['created_at']
    
    def __str__(self):
        return f"{self.sender.username}: {self.content[:50]}"
    
    def mark_as_read(self):
        """Mark message as read"""
        from django.utils import timezone
        if not self.read_at:
            self.read_at = timezone.now()
            self.save(update_fields=['read_at'])

