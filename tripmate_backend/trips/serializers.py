# trips/serializers.py - COMPLETE FILE with proper imports
from rest_framework import serializers
from .models import Trip, TripMedia  # Import both models

class TripListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for trip lists - excludes heavy route_data"""
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
    """Full serializer - includes route_data for individual trip views"""
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

# Media serializers
class TripMediaSerializer(serializers.ModelSerializer):
    file_url = serializers.SerializerMethodField()
    file_size = serializers.SerializerMethodField()
    
    class Meta:
        model = TripMedia
        fields = [
            'id', 'stop_index', 'media_type', 'file', 'file_url',
            'title', 'description', 'latitude', 'longitude', 
            'taken_at', 'file_size'
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
            'description', 'latitude', 'longitude'
        ]