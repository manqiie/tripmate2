# trips/admin.py - UPDATED with memory optimization
from django.contrib import admin
from .models import Trip, TripMedia

@admin.register(Trip)
class TripAdmin(admin.ModelAdmin):
    list_display = ('title', 'user', 'start_location', 'end_location', 'start_date', 'end_date', 'created_at')
    list_filter = ('created_at', 'start_date', 'end_date', 'trip_type')
    search_fields = ('title', 'user__username', 'user__email', 'start_location', 'end_location')
    readonly_fields = ('created_at', 'updated_at')
    date_hierarchy = 'created_at'
    
    # MEMORY OPTIMIZATION SETTINGS
    list_per_page = 25  # Show only 25 records per page instead of all
    list_max_show_all = 100  # Maximum records to show when "Show all" is clicked
    show_full_result_count = False  # Don't count total records (saves memory)
    
    # Optimize database queries
    list_select_related = ('user',)  # Avoid N+1 queries for user
    
    # Exclude heavy fields from list view
    def get_queryset(self, request):
        # Only load necessary fields for the list view
        return super().get_queryset(request).defer(
            'route_data', 'checklist_data', 'waypoints'
        )
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('user', 'title', 'start_location', 'end_location', 'trip_type')
        }),
        ('Trip Details', {
            'fields': ('start_date', 'end_date', 'travelers', 'waypoints')
        }),
        ('Route Information', {
            'fields': ('total_distance', 'total_duration', 'route_data'),
            'classes': ('collapse',)
        }),
        ('Checklist', {
            'fields': ('checklist_data',),
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
    
    # MEMORY OPTIMIZATION
    list_per_page = 50
    list_max_show_all = 200
    show_full_result_count = False
    list_select_related = ('trip', 'trip__user')
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('trip', 'stop_index', 'media_type', 'file')
        }),
        ('Media Details', {
            'fields': ('title', 'description', 'notes')
        }),
        ('Location', {
            'fields': ('latitude', 'longitude'),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('custom_date', 'custom_time', 'taken_at'),
            'classes': ('collapse',)
        }),
    )