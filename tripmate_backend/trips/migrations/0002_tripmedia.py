# Generated by Django 5.2.2 on 2025-06-09 17:09

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('trips', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='TripMedia',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('stop_index', models.IntegerField()),
                ('media_type', models.CharField(choices=[('photo', 'Photo'), ('video', 'Video'), ('audio', 'Audio')], max_length=10)),
                ('file', models.FileField(upload_to='trip_media/')),
                ('title', models.CharField(blank=True, max_length=200)),
                ('description', models.TextField(blank=True)),
                ('latitude', models.FloatField(blank=True, null=True)),
                ('longitude', models.FloatField(blank=True, null=True)),
                ('taken_at', models.DateTimeField(auto_now_add=True)),
                ('trip', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='media', to='trips.trip')),
            ],
            options={
                'ordering': ['-taken_at'],
            },
        ),
    ]
