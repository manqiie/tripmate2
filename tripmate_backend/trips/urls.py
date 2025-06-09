# trips/urls.py
from django.urls import path
from . import views

urlpatterns = [
    path('', views.TripListCreateView.as_view(), name='trip-list-create'),
    path('<int:pk>/', views.TripDetailView.as_view(), name='trip-detail'),
    path('stats/', views.trip_stats, name='trip-stats'),
    path('<int:trip_id>/media/', views.trip_media, name='trip-media'),
    path('<int:trip_id>/media/<int:media_id>/', views.delete_trip_media, name='delete-trip-media'),
]