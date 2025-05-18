from django.db import models
from django import forms
from django.contrib.auth.forms import UserCreationForm
from django.contrib.auth.models import User
from PIL import Image
from django.urls import reverse


from django.db import models
from django.contrib.auth.models import User
from django.urls import reverse
from PIL import Image
from io import BytesIO
from django.core.files.base import ContentFile

class Profile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    image = models.ImageField(default='default.jpg', upload_to='profile_pics')
    bio = models.TextField(blank=True, default='')

    def __str__(self):
        return f'{self.user.username} Profile'

    def get_absolute_url(self):
        return reverse('post-detail', kwargs={'pk': self.pk})

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)

        if self.image:
            try:
                img = Image.open(self.image)

                if img.height > 300 or img.width > 300:
                    output_size = (300, 300)
                    img.thumbnail(output_size)

                    buffer = BytesIO()
                    img.save(buffer, format='JPEG')
                    buffer.seek(0)

                    self.image.save(self.image.name, ContentFile(buffer.read()), save=False)
                    buffer.close()

                    super().save(*args, **kwargs)  # Save resized image
            except Exception as e:
                # Optional: log or handle the error
                print(f"Image resizing failed: {e}")


