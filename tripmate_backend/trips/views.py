# trips/views.py - Updated with checklist endpoints and TripPlaces
from rest_framework import generics, permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django.db.models import Q, Sum, Count
from django.core.files.storage import default_storage
from .models import Trip, TripMedia, TripPlaces
from .serializers import (
    TripSerializer, TripCreateSerializer, TripListSerializer,
    TripMediaSerializer, TripMediaCreateSerializer, TripTimelineSerializer,
    ChecklistUpdateSerializer, TripPlacesSerializer, TripPlacesCreateSerializer, 
    TripPlacesUpdateSerializer, TripDetailSerializer
)
from .checklist_service import ChecklistService

class TripListCreateView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated]
    
    def get_serializer_class(self):
        if self.request.method == 'POST':
            return TripCreateSerializer
        return TripListSerializer
    
    def get_queryset(self):
        queryset = Trip.objects.filter(user=self.request.user).defer('route_data')
        
        # Search functionality
        search = self.request.query_params.get('search', None)
        if search:
            queryset = queryset.filter(
                Q(title__icontains=search) |
                Q(start_location__icontains=search) |
                Q(end_location__icontains=search)
            )
        
        # Filter by trip type
        trip_type = self.request.query_params.get('trip_type', None)
        if trip_type:
            queryset = queryset.filter(trip_type=trip_type)
        
        return queryset.order_by('-created_at')

# Updated to use TripDetailSerializer for enhanced functionality
class TripDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = TripDetailSerializer  # Changed from TripSerializer
    
    def get_queryset(self):
        return Trip.objects.filter(user=self.request.user).prefetch_related('saved_places')

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def trip_stats(request):
    """Get user's trip statistics"""
    try:
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
        
        # Get trip type distribution
        trip_types = Trip.objects.filter(user=request.user).values('trip_type').annotate(
            count=Count('id')
        ).order_by('-count')
        
        # Get recent trips with minimal data
        recent_trips = Trip.objects.filter(user=request.user).only(
            'id', 'title', 'start_location', 'end_location', 'created_at', 'trip_type'
        ).order_by('-created_at')[:3]
        
        recent_trips_data = []
        for trip in recent_trips:
            recent_trips_data.append({
                'id': trip.id,
                'title': trip.title,
                'start_location': trip.start_location,
                'end_location': trip.end_location,
                'trip_type': trip.trip_type,
                'created_at': trip.created_at
            })
        
        stats = {
            'total_trips': int(total_trips),
            'total_distance': round(float(total_distance), 2),
            'total_duration': int(total_duration),
            'trip_types': list(trip_types),
            'recent_trips': recent_trips_data
        }
        
        return Response(stats)
        
    except Exception as e:
        print(f"Error in trip_stats: {e}")
        return Response({
            'total_trips': 0,
            'total_distance': 0.0,
            'total_duration': 0,
            'trip_types': [],
            'recent_trips': []
        })

# NEW: Trip Places endpoints
@api_view(['GET', 'POST'])
@permission_classes([permissions.IsAuthenticated])
def trip_places(request, trip_id):
    """Get or create places for a trip"""
    try:
        trip = Trip.objects.get(id=trip_id, user=request.user)
    except Trip.DoesNotExist:
        return Response({'error': 'Trip not found'}, status=404)
    
    if request.method == 'GET':
        # Get places for specific stop or all places
        stop_index = request.query_params.get('stop_index')
        places_queryset = trip.saved_places.all()
        
        if stop_index is not None:
            places_queryset = places_queryset.filter(stop_index=int(stop_index))
        
        serializer = TripPlacesSerializer(places_queryset, many=True)
        return Response(serializer.data)
    
    elif request.method == 'POST':
        serializer = TripPlacesCreateSerializer(
            data=request.data, 
            context={'trip': trip}
        )
        if serializer.is_valid():
            try:
                place = serializer.save()
                response_serializer = TripPlacesSerializer(place)
                return Response(response_serializer.data, status=201)
            except Exception as e:
                # Handle duplicate place_id for same trip
                if 'unique_trip_place' in str(e):
                    return Response({
                        'error': 'This place is already saved to your trip',
                        'code': 'DUPLICATE_PLACE'
                    }, status=400)
                return Response({'error': str(e)}, status=400)
        return Response(serializer.errors, status=400)

@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([permissions.IsAuthenticated])
def trip_place_detail(request, trip_id, place_id):
    """Get, update, or delete a specific saved place"""
    try:
        trip = Trip.objects.get(id=trip_id, user=request.user)
        place = trip.saved_places.get(id=place_id)
    except (Trip.DoesNotExist, TripPlaces.DoesNotExist):
        return Response({'error': 'Place not found'}, status=404)
    
    if request.method == 'GET':
        serializer = TripPlacesSerializer(place)
        return Response(serializer.data)
    
    elif request.method == 'PUT':
        serializer = TripPlacesUpdateSerializer(place, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            response_serializer = TripPlacesSerializer(place)
            return Response(response_serializer.data)
        return Response(serializer.errors, status=400)
    
    elif request.method == 'DELETE':
        place.delete()
        return Response({'message': 'Place removed from trip successfully'})

@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def bulk_save_places(request, trip_id):
    """Save multiple places to a trip at once"""
    try:
        trip = Trip.objects.get(id=trip_id, user=request.user)
    except Trip.DoesNotExist:
        return Response({'error': 'Trip not found'}, status=404)
    
    places_data = request.data.get('places', [])
    if not places_data:
        return Response({'error': 'No places provided'}, status=400)
    
    created_places = []
    errors = []
    
    for place_data in places_data:
        serializer = TripPlacesCreateSerializer(
            data=place_data,
            context={'trip': trip}
        )
        if serializer.is_valid():
            try:
                place = serializer.save()
                created_places.append(TripPlacesSerializer(place).data)
            except Exception as e:
                if 'unique_trip_place' in str(e):
                    errors.append({
                        'place_name': place_data.get('name', 'Unknown'),
                        'error': 'Already saved to trip'
                    })
                else:
                    errors.append({
                        'place_name': place_data.get('name', 'Unknown'),
                        'error': str(e)
                    })
        else:
            errors.append({
                'place_name': place_data.get('name', 'Unknown'),
                'error': serializer.errors
            })
    
    return Response({
        'created_places': created_places,
        'errors': errors,
        'summary': {
            'created': len(created_places),
            'failed': len(errors)
        }
    })

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def trip_places_map_data(request, trip_id):
    """Get places data optimized for map display"""
    try:
        trip = Trip.objects.get(id=trip_id, user=request.user)
    except Trip.DoesNotExist:
        return Response({'error': 'Trip not found'}, status=404)
    
    places = trip.saved_places.all()
    
    # Format data for map markers
    map_places = []
    for place in places:
        map_places.append({
            'id': place.id,
            'place_id': place.place_id,
            'name': place.name,
            'address': place.address,
            'location': {
                'lat': place.latitude,
                'lng': place.longitude
            },
            'rating': place.rating,
            'types': place.types,
            'stop_index': place.stop_index,
            'stop_name': place.stop_name,
            'is_visited': place.is_visited,
            'user_rating': place.user_rating,
            'user_notes': place.user_notes
        })
    
    return Response({
        'trip': {
            'id': trip.id,
            'title': trip.title
        },
        'places': map_places,
        'places_by_stop': _group_places_by_stop(map_places)
    })

def _group_places_by_stop(places):
    """Helper function to group places by stop"""
    grouped = {}
    for place in places:
        stop_index = place['stop_index']
        if stop_index not in grouped:
            grouped[stop_index] = []
        grouped[stop_index].append(place)
    return grouped

# Checklist endpoints
@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def checklist_templates(request):
    """Get available checklist templates"""
    templates = ChecklistService.get_default_checklist_templates()
    categories = ChecklistService.get_checklist_categories()
    
    # Get trip type choices
    trip_types = [
        {'value': choice[0], 'label': choice[1]} 
        for choice in Trip.TRIP_TYPES
    ]
    
    return Response({
        'trip_types': trip_types,
        'templates': templates,
        'categories': categories
    })

@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def generate_checklist(request):
    """Generate a new checklist based on parameters"""
    trip_type = request.data.get('trip_type', 'leisure')
    duration_days = request.data.get('duration_days')
    travelers = request.data.get('travelers', 1)
    international = request.data.get('international', False)
    
    checklist = ChecklistService.generate_checklist_for_trip(
        trip_type=trip_type,
        duration_days=duration_days,
        travelers=travelers,
        international=international
    )
    
    return Response({
        'checklist': checklist,
        'categories': ChecklistService.get_checklist_categories()
    })

@api_view(['PUT'])
@permission_classes([permissions.IsAuthenticated])
def update_trip_checklist(request, trip_id):
    """Update checklist for a specific trip"""
    try:
        trip = Trip.objects.get(id=trip_id, user=request.user)
    except Trip.DoesNotExist:
        return Response({'error': 'Trip not found'}, status=404)
    
    serializer = ChecklistUpdateSerializer(data=request.data)
    if serializer.is_valid():
        trip.checklist_data = serializer.validated_data['checklist_data']
        trip.save()
        
        # Return updated trip data
        trip_serializer = TripSerializer(trip, context={'request': request})
        return Response(trip_serializer.data)
    
    return Response(serializer.errors, status=400)

@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def regenerate_trip_checklist(request, trip_id):
    """Regenerate checklist for a trip (useful after editing trip details)"""
    try:
        trip = Trip.objects.get(id=trip_id, user=request.user)
    except Trip.DoesNotExist:
        return Response({'error': 'Trip not found'}, status=404)
    
    # Determine if international
    is_international = any(
        country in (trip.start_location + ' ' + trip.end_location + ' ' + ' '.join(trip.waypoints or [])).lower()
        for country in ['singapore', 'malaysia', 'thailand', 'japan', 'korea', 'china', 'usa', 'uk', 'france']
    )
    
    # Generate new checklist
    new_checklist = ChecklistService.generate_checklist_for_trip(
        trip_type=trip.trip_type,
        duration_days=trip.duration_days,
        travelers=trip.travelers,
        international=is_international
    )
    
    # Option to merge with existing or replace
    merge_with_existing = request.data.get('merge_with_existing', False)
    
    if merge_with_existing and trip.checklist_data:
        # Keep existing completed items and add new ones
        existing_texts = {item['text'] for item in trip.checklist_data}
        completed_items = {
            item['text']: item for item in trip.checklist_data 
            if item.get('completed', False)
        }
        
        # Update new checklist with completed status
        for item in new_checklist:
            if item['text'] in completed_items:
                item['completed'] = True
        
        # Add any custom items from existing checklist that aren't in new one
        for existing_item in trip.checklist_data:
            if existing_item['text'] not in {item['text'] for item in new_checklist}:
                new_checklist.append(existing_item)
    
    trip.checklist_data = new_checklist
    trip.save()
    
    trip_serializer = TripSerializer(trip, context={'request': request})
    return Response(trip_serializer.data)

# Timeline endpoint
@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def trip_timeline(request, trip_id):
    """Get trip timeline data for automated slideshow"""
    try:
        trip = Trip.objects.get(id=trip_id, user=request.user)
        serializer = TripTimelineSerializer(trip, context={'request': request})
        return Response(serializer.data)
    except Trip.DoesNotExist:
        return Response({'error': 'Trip not found'}, status=404)

# Media views (unchanged)
@api_view(['GET', 'POST'])
@permission_classes([permissions.IsAuthenticated])
def trip_media(request, trip_id):
    """Get or create media for a trip"""
    try:
        trip = Trip.objects.get(id=trip_id, user=request.user)
    except Trip.DoesNotExist:
        return Response({'error': 'Trip not found'}, status=404)
    
    if request.method == 'GET':
        stop_index = request.query_params.get('stop_index')
        media_queryset = trip.media.all()
        
        if stop_index is not None:
            media_queryset = media_queryset.filter(stop_index=int(stop_index))
        
        serializer = TripMediaSerializer(
            media_queryset, 
            many=True, 
            context={'request': request}
        )
        return Response(serializer.data)
    
    elif request.method == 'POST':
        serializer = TripMediaCreateSerializer(data=request.data)
        if serializer.is_valid():
            media = serializer.save(trip=trip)
            response_serializer = TripMediaSerializer(
                media, 
                context={'request': request}
            )
            return Response(response_serializer.data, status=201)
        return Response(serializer.errors, status=400)

@api_view(['DELETE'])
@permission_classes([permissions.IsAuthenticated])
def delete_trip_media(request, trip_id, media_id):
    """Delete a specific media item"""
    try:
        trip = Trip.objects.get(id=trip_id, user=request.user)
        media = trip.media.get(id=media_id)
        
        if media.file:
            default_storage.delete(media.file.name)
        
        media.delete()
        return Response({'message': 'Media deleted successfully'})
    except (Trip.DoesNotExist, TripMedia.DoesNotExist):
        return Response({'error': 'Media not found'}, status=404)