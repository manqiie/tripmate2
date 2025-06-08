// src/components/maps/GoogleMap.jsx - Improved version with better route handling
import React, { useEffect, useRef, useState } from 'react';
import googleMapsService from '../../services/googleMaps';

const GoogleMap = ({ 
  center = { lat: 40.7128, lng: -74.0060 }, 
  zoom = 10, 
  route = null,
  markers = [],
  onMapClick = null,
  className = "w-full h-96"
}) => {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const directionsRendererRef = useRef(null);
  const markersRef = useRef([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    initializeMap();
  }, []);

  useEffect(() => {
    if (isLoaded && route) {
      renderRoute();
    }
  }, [route, isLoaded]);

  useEffect(() => {
    if (isLoaded && markers.length > 0) {
      renderMarkers();
    }
  }, [markers, isLoaded]);

  const initializeMap = async () => {
    try {
      console.log('Initializing Google Map...');
      await googleMapsService.loadGoogleMaps();
      
      const map = new window.google.maps.Map(mapRef.current, {
        center,
        zoom,
        mapTypeControl: true,
        streetViewControl: true,
        fullscreenControl: true,
        zoomControl: true,
        mapTypeControlOptions: {
          style: window.google.maps.MapTypeControlStyle.HORIZONTAL_BAR,
          position: window.google.maps.ControlPosition.TOP_CENTER,
        },
        zoomControlOptions: {
          position: window.google.maps.ControlPosition.RIGHT_CENTER,
        },
        streetViewControlOptions: {
          position: window.google.maps.ControlPosition.RIGHT_CENTER,
        },
      });

      if (onMapClick) {
        map.addListener('click', onMapClick);
      }

      mapInstanceRef.current = map;
      setIsLoaded(true);
      console.log('Google Map initialized successfully');
    } catch (err) {
      console.error('Failed to initialize map:', err);
      setError(err.message);
    }
  };

  const renderRoute = () => {
    if (!mapInstanceRef.current || !route) {
      console.log('Cannot render route: map or route not available');
      return;
    }

    try {
      console.log('Rendering route on map...');
      
      // Clear existing directions
      if (directionsRendererRef.current) {
        directionsRendererRef.current.setMap(null);
      }

      // Create new directions renderer with custom styling
      directionsRendererRef.current = new window.google.maps.DirectionsRenderer({
        draggable: false,
        panel: null,
        polylineOptions: {
          strokeColor: '#1f7cd4',
          strokeWeight: 6,
          strokeOpacity: 0.8,
        },
        markerOptions: {
          icon: {
            scale: 8,
            fillColor: '#1f7cd4',
            fillOpacity: 1,
            strokeWeight: 2,
            strokeColor: '#ffffff',
          }
        }
      });

      directionsRendererRef.current.setMap(mapInstanceRef.current);
      directionsRendererRef.current.setDirections(route);

      // Fit the map to show the entire route
      const bounds = new window.google.maps.LatLngBounds();
      const legs = route.routes[0].legs;
      
      legs.forEach(leg => {
        leg.steps.forEach(step => {
          bounds.extend(step.start_location);
          bounds.extend(step.end_location);
        });
      });

      mapInstanceRef.current.fitBounds(bounds);
      
      // Ensure minimum zoom level
      const listener = window.google.maps.event.addListener(mapInstanceRef.current, 'idle', () => {
        if (mapInstanceRef.current.getZoom() > 16) {
          mapInstanceRef.current.setZoom(16);
        }
        window.google.maps.event.removeListener(listener);
      });

      console.log('Route rendered successfully');
    } catch (err) {
      console.error('Failed to render route:', err);
      setError(`Failed to render route: ${err.message}`);
    }
  };

  const renderMarkers = () => {
    if (!mapInstanceRef.current) return;

    try {
      // Clear existing markers
      markersRef.current.forEach(marker => marker.setMap(null));
      markersRef.current = [];

      // Create new markers
      markers.forEach((markerData, index) => {
        const marker = new window.google.maps.Marker({
          position: markerData.position,
          map: mapInstanceRef.current,
          title: markerData.title,
          icon: markerData.icon || {
            path: window.google.maps.SymbolPath.CIRCLE,
            scale: 8,
            fillColor: '#ff4444',
            fillOpacity: 1,
            strokeWeight: 2,
            strokeColor: '#ffffff',
          },
          animation: markerData.animation || null,
        });

        if (markerData.infoWindow) {
          const infoWindow = new window.google.maps.InfoWindow({
            content: markerData.infoWindow,
          });

          marker.addListener('click', () => {
            // Close all other info windows
            markersRef.current.forEach(m => {
              if (m.infoWindow) m.infoWindow.close();
            });
            infoWindow.open(mapInstanceRef.current, marker);
          });

          marker.infoWindow = infoWindow;
        }

        markersRef.current.push(marker);
      });

      console.log(`Rendered ${markers.length} markers`);
    } catch (err) {
      console.error('Failed to render markers:', err);
    }
  };

  const refreshMap = () => {
    setError(null);
    setIsLoaded(false);
    if (mapInstanceRef.current) {
      mapInstanceRef.current = null;
    }
    if (directionsRendererRef.current) {
      directionsRendererRef.current = null;
    }
    markersRef.current = [];
    initializeMap();
  };

  if (error) {
    return (
      <div className={`${className} flex items-center justify-center bg-gray-100 text-red-600 p-4 rounded-lg border border-red-200`}>
        <div className="text-center">
          <div className="mb-3">
            <svg className="w-12 h-12 mx-auto text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.351 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <p className="font-medium mb-2">Failed to load map</p>
          <p className="text-sm mb-3">{error}</p>
          <button
            onClick={refreshMap}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className={`${className} flex items-center justify-center bg-gray-100 rounded-lg`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-gray-600">Loading map...</p>
          <p className="text-xs text-gray-500 mt-1">This may take a few seconds</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <div ref={mapRef} className={className} />
      {route && (
        <div className="absolute top-2 left-2 bg-white rounded-lg shadow-lg px-3 py-2 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            <span className="text-gray-700">Optimized Route</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default GoogleMap;