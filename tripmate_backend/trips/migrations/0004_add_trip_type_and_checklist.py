# trips/migrations/0004_add_trip_type_and_checklist.py
from django.db import migrations, models
import json

def create_default_checklists(apps, schema_editor):
    """Add default checklist data for existing trips"""
    Trip = apps.get_model('trips', 'Trip')
    
    # Default checklist for existing trips
    default_checklist = [
        {"id": 1, "text": "Check passport validity", "category": "documents", "completed": False},
        {"id": 2, "text": "Book accommodations", "category": "booking", "completed": False},
        {"id": 3, "text": "Pack essentials", "category": "packing", "completed": False}
    ]
    
    for trip in Trip.objects.all():
        trip.trip_type = 'leisure'  # Default type
        trip.checklist_data = default_checklist
        trip.save()

class Migration(migrations.Migration):

    dependencies = [
        ('trips', '0003_add_timeline_fields'),
    ]

    operations = [
        migrations.AddField(
            model_name='trip',
            name='trip_type',
            field=models.CharField(
                max_length=20,
                choices=[
                    ('leisure', 'Leisure/Vacation'),
                    ('business', 'Business Trip'),
                    ('adventure', 'Adventure/Outdoor'),
                    ('family', 'Family Trip'),
                    ('romantic', 'Romantic Getaway'),
                    ('cultural', 'Cultural/Historical'),
                    ('backpacking', 'Backpacking'),
                    ('luxury', 'Luxury Travel'),
                    ('road_trip', 'Road Trip'),
                    ('group', 'Group Travel')
                ],
                default='leisure'
            ),
        ),
        migrations.AddField(
            model_name='trip',
            name='checklist_data',
            field=models.JSONField(default=list, blank=True),
        ),
        migrations.RunPython(create_default_checklists, migrations.RunPython.noop),
    ]