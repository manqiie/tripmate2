// src/components/maps/GoogleMap.jsx
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
      await googleMapsService.loadGoogleMaps();
      
      const map = new window.google.maps.Map(mapRef.current, {
        center,
        zoom,
        mapTypeControl: true,
        streetViewControl: true,
        fullscreenControl: true,
      });

      if (onMapClick) {
        map.addListener('click', onMapClick);
      }

      mapInstanceRef.current = map;
      setIsLoaded(true);
    } catch (err) {
      setError(err.message);
    }
  };

  const renderRoute = () => {
    if (!mapInstanceRef.current || !route) return;

    // Clear existing directions
    if (directionsRendererRef.current) {
      directionsRendererRef.current.setMap(null);
    }

    // Create new directions renderer
    directionsRendererRef.current = new window.google.maps.DirectionsRenderer({
      draggable: false,
      panel: null,
    });

    directionsRendererRef.current.setMap(mapInstanceRef.current);
    directionsRendererRef.current.setDirections(route);
  };

  const renderMarkers = () => {
    if (!mapInstanceRef.current) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];

    // Create new markers
    markers.forEach(markerData => {
      const marker = new window.google.maps.Marker({
        position: markerData.position,
        map: mapInstanceRef.current,
        title: markerData.title,
        icon: markerData.icon || null,
      });

      if (markerData.infoWindow) {
        const infoWindow = new window.google.maps.InfoWindow({
          content: markerData.infoWindow,
        });

        marker.addListener('click', () => {
          infoWindow.open(mapInstanceRef.current, marker);
        });
      }

      markersRef.current.push(marker);
    });
  };

  if (error) {
    return (
      <div className={`${className} flex items-center justify-center bg-gray-100 text-red-600`}>
        <div className="text-center">
          <p>Failed to load map</p>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className={`${className} flex items-center justify-center bg-gray-100`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-gray-600">Loading map...</p>
        </div>
      </div>
    );
  }

  return <div ref={mapRef} className={className} />;
};

export default GoogleMap;