# trips/urls.py - Updated with checklist endpoints
from django.urls import path
from . import views

urlpatterns = [
    # Trip CRUD
    path('', views.TripListCreateView.as_view(), name='trip-list-create'),
    path('<int:pk>/', views.TripDetailView.as_view(), name='trip-detail'),
    path('stats/', views.trip_stats, name='trip-stats'),
    
    # Checklist endpoints
    path('checklist/templates/', views.checklist_templates, name='checklist-templates'),
    path('checklist/generate/', views.generate_checklist, name='generate-checklist'),
    path('<int:trip_id>/checklist/', views.update_trip_checklist, name='update-trip-checklist'),
    path('<int:trip_id>/checklist/regenerate/', views.regenerate_trip_checklist, name='regenerate-trip-checklist'),
    
    # Timeline and media
    path('<int:trip_id>/timeline/', views.trip_timeline, name='trip-timeline'),
    path('<int:trip_id>/media/', views.trip_media, name='trip-media'),
    path('<int:trip_id>/media/<int:media_id>/', views.delete_trip_media, name='delete-trip-media'),

    # Trip places endpoints
    path('<int:trip_id>/places/', views.trip_places, name='trip-places'),
    path('<int:trip_id>/places/<int:place_id>/', views.trip_place_detail, name='trip-place-detail'),
    path('<int:trip_id>/places/bulk/', views.bulk_save_places, name='bulk-save-places'),
    path('<int:trip_id>/places/map-data/', views.trip_places_map_data, name='trip-places-map-data'),
]
