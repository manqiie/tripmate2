
# trips/views.py
from rest_framework import generics, permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django.db.models import Q
from .models import Trip
from .serializers import TripSerializer, TripCreateSerializer

class TripListCreateView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated]
    
    def get_serializer_class(self):
        if self.request.method == 'POST':
            return TripCreateSerializer
        return TripSerializer
    
    def get_queryset(self):
        queryset = Trip.objects.filter(user=self.request.user)
        
        # Search functionality
        search = self.request.query_params.get('search', None)
        if search:
            queryset = queryset.filter(
                Q(title__icontains=search) |
                Q(start_location__icontains=search) |
                Q(end_location__icontains=search)
            )
        
        return queryset

class TripDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = TripSerializer
    
    def get_queryset(self):
        return Trip.objects.filter(user=self.request.user)

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def trip_stats(request):
    """Get user's trip statistics"""
    trips = Trip.objects.filter(user=request.user)
    
    stats = {
        'total_trips': trips.count(),
        'total_distance': sum(trip.total_distance for trip in trips),
        'total_duration': sum(trip.total_duration for trip in trips),
        'recent_trips': TripSerializer(trips[:5], many=True).data
    }
    
    return Response(stats)