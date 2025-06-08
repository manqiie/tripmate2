# tripmate_backend/trips/views.py - COMPLETE OPTIMIZED VERSION

from rest_framework import generics, permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django.db.models import Q, Sum, Count
from .models import Trip
from .serializers import TripSerializer, TripCreateSerializer, TripListSerializer

class TripListCreateView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated]
    
    def get_serializer_class(self):
        if self.request.method == 'POST':
            return TripCreateSerializer
        # Use lightweight serializer for list view
        return TripListSerializer
    
    def get_queryset(self):
        # Exclude route_data field to reduce memory usage
        queryset = Trip.objects.filter(user=self.request.user).defer('route_data')
        
        # Search functionality
        search = self.request.query_params.get('search', None)
        if search:
            queryset = queryset.filter(
                Q(title__icontains=search) |
                Q(start_location__icontains=search) |
                Q(end_location__icontains=search)
            )
        
        return queryset.order_by('-created_at')

class TripDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = TripSerializer  # Full serializer for detail view
    
    def get_queryset(self):
        return Trip.objects.filter(user=self.request.user)

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def trip_stats(request):
    """Get user's trip statistics - ULTRA LIGHTWEIGHT"""
    try:
        # Use raw SQL aggregation to minimize memory usage
        from django.db import connection
        
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT 
                    COUNT(*) as total_trips,
                    COALESCE(SUM(total_distance), 0) as total_distance,
                    COALESCE(SUM(total_duration), 0) as total_duration
                FROM trips_trip 
                WHERE user_id = %s
            """, [request.user.id])
            
            row = cursor.fetchone()
            total_trips, total_distance, total_duration = row
        
        # Get only 3 recent trips with minimal data
        recent_trips = Trip.objects.filter(user=request.user).only(
            'id', 'title', 'start_location', 'end_location', 'created_at'
        ).order_by('-created_at')[:3]
        
        # Serialize minimal data
        recent_trips_data = []
        for trip in recent_trips:
            recent_trips_data.append({
                'id': trip.id,
                'title': trip.title,
                'start_location': trip.start_location,
                'end_location': trip.end_location,
                'created_at': trip.created_at
            })
        
        stats = {
            'total_trips': int(total_trips),
            'total_distance': round(float(total_distance), 2),
            'total_duration': int(total_duration),
            'recent_trips': recent_trips_data
        }
        
        return Response(stats)
        
    except Exception as e:
        print(f"Error in trip_stats: {e}")
        # Ultra-simple fallback
        return Response({
            'total_trips': 0,
            'total_distance': 0.0,
            'total_duration': 0,
            'recent_trips': []
        })