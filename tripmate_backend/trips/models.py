# trips/models.py - Updated with trip type, checklist, and TripPlaces
from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()

class Trip(models.Model):
    TRIP_TYPES = [
        ('leisure', 'Leisure/Vacation'),
        ('business', 'Business Trip'),
        ('adventure', 'Adventure/Outdoor'),
        ('family', 'Family Trip'),
        ('romantic', 'Romantic Getaway'),
        ('cultural', 'Cultural/Historical'),
        ('backpacking', 'Backpacking'),
        ('luxury', 'Luxury Travel'),
        ('road_trip', 'Road Trip'),
        ('group', 'Group Travel'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='trips')
    title = models.CharField(max_length=200)
    start_location = models.CharField(max_length=200)
    end_location = models.CharField(max_length=200)
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    travelers = models.PositiveIntegerField(default=1)
    waypoints = models.JSONField(default=list, blank=True)
    route_data = models.JSONField(null=True, blank=True)
    total_distance = models.FloatField(default=0)
    total_duration = models.IntegerField(default=0)
    
    # New fields
    trip_type = models.CharField(max_length=20, choices=TRIP_TYPES, default='leisure')
    checklist_data = models.JSONField(default=list, blank=True)
    
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
    
    @property
    def checklist_progress(self):
        """Calculate checklist completion percentage"""
        if not self.checklist_data:
            return 0
        
        total_items = len(self.checklist_data)
        completed_items = sum(1 for item in self.checklist_data if item.get('completed', False))
        
        if total_items == 0:
            return 0
        
        return round((completed_items / total_items) * 100)
    
    def get_checklist_by_category(self):
        """Group checklist items by category"""
        categories = {}
        for item in self.checklist_data:
            category = item.get('category', 'general')
            if category not in categories:
                categories[category] = []
            categories[category].append(item)
        return categories


class TripPlaces(models.Model):
    """Model to store places saved to specific trips"""
    trip = models.ForeignKey(Trip, on_delete=models.CASCADE, related_name='saved_places')
    stop_index = models.IntegerField()  # Which stop this place belongs to
    
    # Place data from Google Places API
    place_id = models.CharField(max_length=255)  # Google Place ID
    name = models.CharField(max_length=255)
    address = models.TextField()
    latitude = models.FloatField()
    longitude = models.FloatField()
    
    # Additional place info
    rating = models.FloatField(null=True, blank=True)
    user_ratings_total = models.IntegerField(null=True, blank=True)
    types = models.JSONField(default=list, blank=True)  # Place types from Google
    phone = models.CharField(max_length=50, blank=True)
    website = models.URLField(blank=True)
    
    # User notes and customization
    user_notes = models.TextField(blank=True)
    is_visited = models.BooleanField(default=False)
    visit_date = models.DateField(null=True, blank=True)
    user_rating = models.IntegerField(null=True, blank=True, choices=[
        (1, '1 Star'), (2, '2 Stars'), (3, '3 Stars'), (4, '4 Stars'), (5, '5 Stars')
    ])
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['stop_index', 'name']
        unique_together = ['trip', 'place_id']  # Prevent duplicate places in same trip
    
    def __str__(self):
        return f"{self.trip.title} - {self.name}"
    
    @property
    def stop_name(self):
        """Get the name of the stop this place belongs to"""
        try:
            if self.stop_index == 0:
                return self.trip.start_location
            elif self.stop_index == len(self.trip.waypoints) + 1:
                return self.trip.end_location
            else:
                return self.trip.waypoints[self.stop_index - 1]
        except (IndexError, AttributeError):
            return f"Stop {self.stop_index + 1}"


class TripMedia(models.Model):
    MEDIA_TYPES = [
        ('photo', 'Photo'),
        ('video', 'Video'),
        ('audio', 'Audio'),
    ]
    
    trip = models.ForeignKey(Trip, on_delete=models.CASCADE, related_name='media')
    stop_index = models.IntegerField()
    media_type = models.CharField(max_length=10, choices=MEDIA_TYPES)
    file = models.FileField(upload_to='trip_media/')
    title = models.CharField(max_length=200, blank=True)
    description = models.TextField(blank=True)
    notes = models.TextField(blank=True)
    
    # Location data
    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)
    
    # Timestamp data
    custom_date = models.DateField(null=True, blank=True)
    custom_time = models.TimeField(null=True, blank=True)
    taken_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['custom_date', 'custom_time', '-taken_at']
    
    def __str__(self):
        return f"{self.trip.title} - {self.get_media_type_display()}"
    
    @property
    def display_datetime(self):
        """Get the display datetime (custom or actual upload time)"""
        if self.custom_date:
            if self.custom_time:
                from datetime import datetime, time
                return datetime.combine(self.custom_date, self.custom_time)
            else:
                from datetime import datetime, time
                return datetime.combine(self.custom_date, time(12, 0))
        return self.taken_at
    
    @property
    def timeline_date(self):
        """Get the date for timeline sorting"""
        return self.custom_date if self.custom_date else self.taken_at.date()