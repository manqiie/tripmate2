# tripmate_backend/trips/serializers.py - Add lightweight serializers

from rest_framework import serializers
from .models import Trip

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