# trips/migrations/0003_add_timeline_fields.py
# Run: python manage.py makemigrations
# Then: python manage.py migrate

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('trips', '0002_tripmedia'),
    ]

    operations = [
        migrations.AddField(
            model_name='tripmedia',
            name='notes',
            field=models.TextField(blank=True),
        ),
        migrations.AddField(
            model_name='tripmedia',
            name='custom_date',
            field=models.DateField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='tripmedia',
            name='custom_time',
            field=models.TimeField(blank=True, null=True),
        ),
        migrations.AlterModelOptions(
            name='tripmedia',
            options={'ordering': ['custom_date', 'custom_time', '-taken_at']},
        ),
    ]