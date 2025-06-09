# trips/models.py - COMPLETE FILE with TripMedia model
from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()

class Trip(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='trips')
    title = models.CharField(max_length=200)
    start_location = models.CharField(max_length=200)
    end_location = models.CharField(max_length=200)
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    travelers = models.PositiveIntegerField(default=1)
    waypoints = models.JSONField(default=list, blank=True)
    route_data = models.JSONField(null=True, blank=True)  # Store Google Maps route data
    total_distance = models.FloatField(default=0)  # in kilometers
    total_duration = models.IntegerField(default=0)  # in minutes
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.title} - {self.user.username}"
    
    @property
    def duration_days(self):
        if self.start_date and self.end_date:
            return (self.end_date - self.start_date).days + 1
        return 0

class TripMedia(models.Model):
    MEDIA_TYPES = [
        ('photo', 'Photo'),
        ('video', 'Video'),
        ('audio', 'Audio'),
    ]
    
    trip = models.ForeignKey(Trip, on_delete=models.CASCADE, related_name='media')
    stop_index = models.IntegerField()  # Which stop this media belongs to
    media_type = models.CharField(max_length=10, choices=MEDIA_TYPES)
    file = models.FileField(upload_to='trip_media/')
    title = models.CharField(max_length=200, blank=True)
    description = models.TextField(blank=True)
    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)
    taken_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-taken_at']
    
    def __str__(self):
        return f"{self.trip.title} - {self.get_media_type_display()}"