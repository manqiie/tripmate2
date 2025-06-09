# trips/admin.py - COMPLETE FILE with TripMedia admin
from django.contrib import admin
from .models import Trip, TripMedia

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

@admin.register(TripMedia)
class TripMediaAdmin(admin.ModelAdmin):
    list_display = ('trip', 'media_type', 'title', 'stop_index', 'taken_at')
    list_filter = ('media_type', 'taken_at')
    search_fields = ('trip__title', 'title', 'description')
    readonly_fields = ('taken_at',)
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('trip', 'stop_index', 'media_type', 'file')
        }),
        ('Media Details', {
            'fields': ('title', 'description')
        }),
        ('Location', {
            'fields': ('latitude', 'longitude'),
            'classes': ('collapse',)
        }),
        ('Metadata', {
            'fields': ('taken_at',),
            'classes': ('collapse',)
        }),
    )