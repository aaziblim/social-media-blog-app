# Generated by Django 5.1.5 on 2025-03-07 09:34

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('blog', '0007_rename_image_post_post_image'),
        ('users', '0005_remove_likepost_post_id_remove_likepost_username_and_more'),
    ]

    operations = [
        migrations.AlterField(
            model_name='likepost',
            name='post',
            field=models.ForeignKey(default=1, on_delete=django.db.models.deletion.CASCADE, to='blog.post'),
            preserve_default=False,
        ),
    ]
