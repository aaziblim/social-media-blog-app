from django.db import migrations, models
import uuid
from django.utils.text import slugify


def generate_slugs(apps, schema_editor):
    Post = apps.get_model('blog', 'Post')
    for post in Post.objects.all().iterator():
        base_slug = slugify(post.title)[:130] or slugify(str(post.public_id))
        slug_candidate = base_slug or slugify(str(post.pk))
        suffix = 1
        while Post.objects.filter(slug=slug_candidate).exclude(pk=post.pk).exists():
            slug_candidate = f"{base_slug}-{suffix}"
            suffix += 1
        post.slug = slug_candidate
        if not post.public_id:
            post.public_id = uuid.uuid4()
        post.save(update_fields=['slug', 'public_id'])


class Migration(migrations.Migration):

    dependencies = [
        ('blog', '0007_rename_image_post_post_image'),
    ]

    operations = [
        # Add nullable fields first to avoid unique conflicts while backfilling existing rows.
        migrations.AddField(
            model_name='post',
            name='public_id',
            field=models.UUIDField(db_index=True, editable=False, null=True, blank=True),
        ),
        migrations.AddField(
            model_name='post',
            name='slug',
            field=models.SlugField(blank=True, max_length=140, null=True),
        ),
        migrations.RunPython(generate_slugs, migrations.RunPython.noop),
        # Enforce constraints after data is populated.
        migrations.AlterField(
            model_name='post',
            name='public_id',
            field=models.UUIDField(db_index=True, default=uuid.uuid4, editable=False, unique=True),
        ),
        migrations.AlterField(
            model_name='post',
            name='slug',
            field=models.SlugField(max_length=140, unique=True),
        ),
    ]
