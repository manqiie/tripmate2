# trips/models.py - Updated with trip type and checklist
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