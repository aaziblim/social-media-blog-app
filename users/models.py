from django.db import models
from django.contrib.auth.models import User
from django.urls import reverse
from PIL import Image
from io import BytesIO
from django.core.files.base import ContentFile


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

    def __str__(self):
        return f'{self.user.username} Profile'

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
