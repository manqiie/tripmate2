# trips/serializers.py - Updated with new fields
from rest_framework import serializers
from .models import Trip, TripMedia
from datetime import datetime

class TripListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for trip lists"""
    duration_days = serializers.ReadOnlyField()
    
    class Meta:
        model = Trip
        fields = [
            'id', 'title', 'start_location', 'end_location', 
            'start_date', 'end_date', 'travelers', 'waypoints',
            'total_distance', 'total_duration', 'duration_days',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

class TripSerializer(serializers.ModelSerializer):
    """Full serializer with route_data"""
    duration_days = serializers.ReadOnlyField()
    
    class Meta:
        model = Trip
        fields = [
            'id', 'title', 'start_location', 'end_location', 
            'start_date', 'end_date', 'travelers', 'waypoints',
            'total_distance', 'total_duration', 'duration_days',
            'route_data', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

class TripCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Trip
        fields = [
            'title', 'start_location', 'end_location', 
            'start_date', 'end_date', 'travelers', 'waypoints',
            'route_data', 'total_distance', 'total_duration'
        ]
    
    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)

# Updated Media serializers
class TripMediaSerializer(serializers.ModelSerializer):
    file_url = serializers.SerializerMethodField()
    file_size = serializers.SerializerMethodField()
    display_datetime = serializers.ReadOnlyField()
    timeline_date = serializers.ReadOnlyField()
    
    class Meta:
        model = TripMedia
        fields = [
            'id', 'stop_index', 'media_type', 'file', 'file_url',
            'title', 'description', 'notes', 'latitude', 'longitude', 
            'custom_date', 'custom_time', 'taken_at', 'file_size',
            'display_datetime', 'timeline_date'
        ]
        read_only_fields = ['id', 'taken_at']
    
    def get_file_url(self, obj):
        if obj.file:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.file.url)
        return None
    
    def get_file_size(self, obj):
        if obj.file:
            return obj.file.size
        return 0

class TripMediaCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = TripMedia
        fields = [
            'stop_index', 'media_type', 'file', 'title', 
            'description', 'notes', 'latitude', 'longitude',
            'custom_date', 'custom_time'
        ]
    
    def validate(self, attrs):
        # If custom_date is provided but it's in the future, warn but allow
        custom_date = attrs.get('custom_date')
        if custom_date and custom_date > datetime.now().date():
            # Could add a warning here if needed
            pass
        return attrs

# NEW: Timeline serializer for automated view
class TripTimelineSerializer(serializers.ModelSerializer):
    """Serializer for timeline/slideshow view"""
    media_items = serializers.SerializerMethodField()
    duration_days = serializers.ReadOnlyField()
    
    class Meta:
        model = Trip
        fields = [
            'id', 'title', 'start_location', 'end_location',
            'start_date', 'end_date', 'duration_days',
            'total_distance', 'total_duration', 'waypoints',
            'media_items'
        ]
    
    def get_media_items(self, obj):
        """Get all media items grouped by date for timeline"""
        media_queryset = obj.media.all().order_by('custom_date', 'custom_time', 'taken_at')
        
        # Group by date
        timeline_data = {}
        for media in media_queryset:
            date_key = media.timeline_date.isoformat()
            if date_key not in timeline_data:
                timeline_data[date_key] = []
            
            timeline_data[date_key].append({
                'id': media.id,
                'media_type': media.media_type,
                'file_url': self.context['request'].build_absolute_uri(media.file.url) if media.file else None,
                'title': media.title,
                'description': media.description,
                'notes': media.notes,
                'stop_index': media.stop_index,
                'custom_date': media.custom_date,
                'custom_time': media.custom_time,
                'display_datetime': media.display_datetime,
                'latitude': media.latitude,
                'longitude': media.longitude
            })
        
        # Convert to sorted list
        timeline_list = []
        for date_key in sorted(timeline_data.keys()):
            timeline_list.append({
                'date': date_key,
                'media_count': len(timeline_data[date_key]),
                'items': timeline_data[date_key]
            })
        
        return timeline_list