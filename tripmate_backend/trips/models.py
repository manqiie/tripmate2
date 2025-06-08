# Create a new Django app: trips
# Run: python manage.py startapp trips

# trips/models.py
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

# trips/admin.py
from django.contrib import admin
from .models import Trip

@admin.register(Trip)
class TripAdmin(admin.ModelAdmin):
    list_display = ('title', 'user', 'start_location', 'end_location', 'start_date', 'end_date', 'created_at')
    list_filter = ('created_at', 'start_date', 'end_date')
    search_fields = ('title', 'user__username', 'user__email', 'start_location', 'end_location')
    readonly_fields = ('created_at', 'updated_at')
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('user', 'title', 'start_location', 'end_location')
        }),
        ('Trip Details', {
            'fields': ('start_date', 'end_date', 'travelers', 'waypoints')
        }),
        ('Route Information', {
            'fields': ('total_distance', 'total_duration', 'route_data'),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )