# trips/serializers.py - Updated with checklist support
from rest_framework import serializers
from .models import Trip, TripMedia
from .checklist_service import ChecklistService
from datetime import datetime

class TripListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for trip lists"""
    duration_days = serializers.ReadOnlyField()
    checklist_progress = serializers.ReadOnlyField()
    trip_type_display = serializers.CharField(source='get_trip_type_display', read_only=True)
    
    class Meta:
        model = Trip
        fields = [
            'id', 'title', 'start_location', 'end_location', 
            'start_date', 'end_date', 'travelers', 'waypoints',
            'total_distance', 'total_duration', 'duration_days',
            'trip_type', 'trip_type_display', 'checklist_progress',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

class TripSerializer(serializers.ModelSerializer):
    """Full serializer with route_data and checklist"""
    duration_days = serializers.ReadOnlyField()
    checklist_progress = serializers.ReadOnlyField()
    trip_type_display = serializers.CharField(source='get_trip_type_display', read_only=True)
    checklist_by_category = serializers.SerializerMethodField()
    
    class Meta:
        model = Trip
        fields = [
            'id', 'title', 'start_location', 'end_location', 
            'start_date', 'end_date', 'travelers', 'waypoints',
            'total_distance', 'total_duration', 'duration_days',
            'trip_type', 'trip_type_display', 'checklist_data', 
            'checklist_progress', 'checklist_by_category',
            'route_data', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_checklist_by_category(self, obj):
        """Group checklist items by category with category metadata"""
        categories = obj.get_checklist_by_category()
        category_info = ChecklistService.get_checklist_categories()
        
        result = {}
        for category, items in categories.items():
            result[category] = {
                'items': items,
                'metadata': category_info.get(category, {
                    'name': category.title(),
                    'icon': '📋',
                    'color': 'gray'
                }),
                'completed_count': sum(1 for item in items if item.get('completed', False)),
                'total_count': len(items)
            }
        
        return result

class TripCreateSerializer(serializers.ModelSerializer):
    generate_checklist = serializers.BooleanField(write_only=True, default=True)
    
    class Meta:
        model = Trip
        fields = [
            'title', 'start_location', 'end_location', 
            'start_date', 'end_date', 'travelers', 'waypoints',
            'trip_type', 'route_data', 'total_distance', 
            'total_duration', 'generate_checklist'
        ]
    
    def create(self, validated_data):
        generate_checklist = validated_data.pop('generate_checklist', True)
        validated_data['user'] = self.context['request'].user
        
        trip = super().create(validated_data)
        
        # Generate checklist if requested
        if generate_checklist:
            # Determine if it's international travel
            is_international = self._is_international_trip(
                trip.start_location, 
                trip.end_location, 
                trip.waypoints
            )
            
            checklist = ChecklistService.generate_checklist_for_trip(
                trip_type=trip.trip_type,
                duration_days=trip.duration_days,
                travelers=trip.travelers,
                international=is_international
            )
            
            trip.checklist_data = checklist
            trip.save()
        
        return trip
    
    def _is_international_trip(self, start_location, end_location, waypoints):
        """Simple heuristic to determine if trip is international"""
        # This is a basic implementation - you might want to use a geocoding service
        # for more accurate country detection
        locations = [start_location, end_location] + (waypoints or [])
        
        # Simple country indicators
        country_indicators = set()
        for location in locations:
            if not location:
                continue
            location_lower = location.lower()
            
            # Common country/region patterns
            if any(country in location_lower for country in [
                'singapore', 'malaysia', 'thailand', 'vietnam', 'indonesia',
                'japan', 'korea', 'china', 'taiwan', 'hong kong', 'macau',
                'philippines', 'cambodia', 'laos', 'myanmar', 'brunei'
            ]):
                country_indicators.add('asia')
            elif any(country in location_lower for country in [
                'usa', 'canada', 'mexico', 'united states', 'america'
            ]):
                country_indicators.add('north_america')
            elif any(country in location_lower for country in [
                'uk', 'france', 'germany', 'italy', 'spain', 'portugal',
                'netherlands', 'belgium', 'switzerland', 'austria', 'britain'
            ]):
                country_indicators.add('europe')
            elif any(country in location_lower for country in [
                'australia', 'new zealand'
            ]):
                country_indicators.add('oceania')
        
        # If we detected multiple regions or if total locations suggest international travel
        return len(country_indicators) > 1 or len(locations) > 3

class ChecklistUpdateSerializer(serializers.Serializer):
    """Serializer for updating checklist items"""
    checklist_data = serializers.ListField(
        child=serializers.DictField(),
        required=True
    )
    
    def validate_checklist_data(self, value):
        """Validate checklist data structure"""
        required_fields = ['id', 'text', 'category', 'completed']
        
        for item in value:
            for field in required_fields:
                if field not in item:
                    raise serializers.ValidationError(
                        f"Each checklist item must have: {', '.join(required_fields)}"
                    )
            
            # Validate completed field is boolean
            if not isinstance(item['completed'], bool):
                raise serializers.ValidationError("'completed' field must be a boolean")
        
        return value

# Media serializers (unchanged)
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
        custom_date = attrs.get('custom_date')
        if custom_date and custom_date > datetime.now().date():
            pass
        return attrs

# Timeline serializer for automated view
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