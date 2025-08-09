# trips/serializers.py - FIXED VERSION - Handles large route data properly
from rest_framework import serializers
from .models import Trip, TripMedia, TripPlaces
from .checklist_service import ChecklistService
from datetime import datetime
import json
import gzip
import base64

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
    
    def validate_route_data(self, value):
        """Validate and optimize route data before saving"""
        if not value:
            return value
        
        # FIXED: Optimize large route data
        try:
            optimized_data = self._optimize_route_data(value)
            
            # Check size after optimization
            json_size = len(json.dumps(optimized_data))
            print(f"📊 Route data size: {json_size:,} characters")
            
            # If still too large (>1MB), compress it
            if json_size > 1_000_000:  # 1MB limit
                compressed_data = self._compress_route_data(optimized_data)
                print(f"🗜️ Compressed route data from {json_size:,} to {len(json.dumps(compressed_data)):,} characters")
                return compressed_data
            
            return optimized_data
            
        except Exception as e:
            print(f"❌ Route data optimization failed: {e}")
            # Fallback: try to compress original data
            try:
                return self._compress_route_data(value)
            except:
                # Last resort: store minimal data
                return self._create_minimal_route_data(value)
    
    def _optimize_route_data(self, route_data):
        """Remove unnecessary data from route to reduce size"""
        if not isinstance(route_data, dict):
            return route_data
        
        optimized = {
            'status': route_data.get('status'),
            'routes': []
        }
        
        # Keep only essential route information
        for route in route_data.get('routes', []):
            optimized_route = {
                'summary': route.get('summary', ''),
                'bounds': route.get('bounds'),
                'legs': [],
                'overview_polyline': route.get('overview_polyline'),  # Keep for map display
                'warnings': route.get('warnings', [])
            }
            
            # Optimize legs - keep essential info, remove detailed steps
            for leg in route.get('legs', []):
                optimized_leg = {
                    'distance': leg.get('distance'),
                    'duration': leg.get('duration'),
                    'start_address': leg.get('start_address'),
                    'end_address': leg.get('end_address'),
                    'start_location': leg.get('start_location'),
                    'end_location': leg.get('end_location'),
                    # Remove detailed steps to save space
                    'steps_count': len(leg.get('steps', []))  # Just store count
                }
                optimized_route['legs'].append(optimized_leg)
            
            optimized['routes'].append(optimized_route)
        
        # Keep waypoint order if it exists
        if 'waypoint_order' in route_data:
            optimized['waypoint_order'] = route_data['waypoint_order']
        
        return optimized
    
    def _compress_route_data(self, route_data):
        """Compress route data using gzip"""
        try:
            # Convert to JSON string
            json_str = json.dumps(route_data)
            
            # Compress using gzip
            compressed = gzip.compress(json_str.encode('utf-8'))
            
            # Encode as base64 for storage
            encoded = base64.b64encode(compressed).decode('utf-8')
            
            return {
                '_compressed': True,
                '_data': encoded,
                '_original_size': len(json_str),
                '_compressed_size': len(encoded)
            }
        except Exception as e:
            print(f"❌ Compression failed: {e}")
            return self._create_minimal_route_data(route_data)
    
    def _create_minimal_route_data(self, route_data):
        """Create minimal route data as fallback"""
        return {
            'status': 'OK',
            'routes': [{
                'summary': 'Route calculated successfully',
                'legs': [{
                    'distance': {'text': 'N/A', 'value': 0},
                    'duration': {'text': 'N/A', 'value': 0}
                }]
            }],
            '_minimal': True,
            '_note': 'Route data was too large and has been minimized'
        }
    
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

# NEW: TripPlaces serializers
class TripPlacesSerializer(serializers.ModelSerializer):
    """Serializer for saved trip places"""
    stop_name = serializers.ReadOnlyField()
    
    class Meta:
        model = TripPlaces
        fields = [
            'id', 'stop_index', 'place_id', 'name', 'address', 
            'latitude', 'longitude', 'rating', 'user_ratings_total',
            'types', 'phone', 'website', 'user_notes', 'is_visited',
            'visit_date', 'user_rating', 'stop_name', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

class TripPlacesCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating trip places"""
    # Extract location data from nested location object
    location = serializers.DictField(write_only=True, required=False)
    
    class Meta:
        model = TripPlaces
        fields = [
            'stop_index', 'place_id', 'name', 'address', 
            'rating', 'user_ratings_total', 'types', 'phone', 
            'website', 'user_notes', 'location'
        ]
    
    def validate(self, attrs):
        # Extract latitude and longitude from location if provided
        location = attrs.pop('location', None)
        if location:
            attrs['latitude'] = location.get('lat')
            attrs['longitude'] = location.get('lng')
        
        # Validate coordinates
        if not attrs.get('latitude') or not attrs.get('longitude'):
            raise serializers.ValidationError("Valid latitude and longitude are required")
        
        return attrs
    
    def create(self, validated_data):
        trip = self.context['trip']
        validated_data['trip'] = trip
        return super().create(validated_data)

class TripPlacesUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating user-specific trip place data"""
    class Meta:
        model = TripPlaces
        fields = ['user_notes', 'is_visited', 'visit_date', 'user_rating']

# Enhanced trip serializer with saved places and route decompression
class TripDetailSerializer(TripSerializer):
    """Enhanced trip serializer with saved places and route decompression"""
    saved_places = TripPlacesSerializer(many=True, read_only=True)
    saved_places_by_stop = serializers.SerializerMethodField()
    route_data = serializers.SerializerMethodField()  # Override to decompress
    
    class Meta(TripSerializer.Meta):
        fields = TripSerializer.Meta.fields + ['saved_places', 'saved_places_by_stop']
    
    def get_route_data(self, obj):
        """Decompress route data if it was compressed"""
        route_data = obj.route_data
        
        if not route_data:
            return None
        
        # Check if data is compressed
        if isinstance(route_data, dict) and route_data.get('_compressed'):
            try:
                # Decode and decompress
                encoded_data = route_data['_data']
                compressed = base64.b64decode(encoded_data.encode('utf-8'))
                decompressed = gzip.decompress(compressed)
                return json.loads(decompressed.decode('utf-8'))
            except Exception as e:
                print(f"❌ Route decompression failed: {e}")
                return {
                    'status': 'OK',
                    'routes': [],
                    '_error': 'Failed to decompress route data'
                }
        
        return route_data
    
    def get_saved_places_by_stop(self, obj):
        """Group saved places by stop index"""
        places_by_stop = {}
        for place in obj.saved_places.all():
            stop_index = place.stop_index
            if stop_index not in places_by_stop:
                places_by_stop[stop_index] = []
            places_by_stop[stop_index].append(TripPlacesSerializer(place).data)
        return places_by_stop

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