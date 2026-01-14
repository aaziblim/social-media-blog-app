# Generated manually for LivestreamSignal
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('blog', '0010_livestream_livestreammessage'),
    ]

    operations = [
        migrations.CreateModel(
            name='LivestreamSignal',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('role', models.CharField(choices=[('host', 'Host'), ('viewer', 'Viewer')], max_length=10)),
                ('kind', models.CharField(choices=[('offer', 'Offer'), ('answer', 'Answer'), ('candidate', 'Candidate')], max_length=10)),
                ('payload', models.JSONField()),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('stream', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='signals', to='blog.livestream')),
            ],
            options={
                'ordering': ['created_at'],
            },
        ),
    ]
