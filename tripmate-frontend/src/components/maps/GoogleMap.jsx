// src/components/maps/GoogleMap.jsx - FIXED VERSION
import React, { useEffect, useRef, useState } from 'react';

const GoogleMap = ({ 
  center = { lat: 3.1390, lng: 101.6869 },
  zoom = 10, 
  route = null,
  markers = [],
  onMapClick = null,
  className = "w-full h-96"
}) => {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const directionsRendererRef = useRef(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState(null);

  // Initialize map
  useEffect(() => {
    const initMap = () => {
      if (!mapRef.current || !window.google?.maps) {
        console.log('❌ Map container or Google Maps not ready');
        return;
      }

      try {
        console.log('🗺️ Creating map instance...');
        
        const map = new window.google.maps.Map(mapRef.current, {
          center,
          zoom,
          mapTypeControl: true,
          streetViewControl: true,
          fullscreenControl: true,
          zoomControl: true,
        });

        mapInstanceRef.current = map;
        
        // Wait for map to be ready
        const checkMapReady = () => {
          if (map.getDiv() && map.getDiv().offsetWidth > 0) {
            console.log('✅ Map is ready and visible');
            setIsLoaded(true);
          } else {
            setTimeout(checkMapReady, 100);
          }
        };
        
        checkMapReady();

        if (onMapClick) {
          map.addListener('click', onMapClick);
        }

      } catch (err) {
        console.error('❌ Error creating map:', err);
        setError(err.message);
      }
    };

    if (window.google && window.google.maps) {
      initMap();
    } else {
      setError('Google Maps API not loaded');
    }
  }, [center, zoom, onMapClick]);

  // Render route when both map and route are ready
  useEffect(() => {
    if (!isLoaded || !mapInstanceRef.current || !route) {
      console.log('⏳ Waiting for map or route...', { 
        isLoaded, 
        hasMap: !!mapInstanceRef.current, 
        hasRoute: !!route 
      });
      return;
    }

    console.log('🛣️ Rendering route...');
    renderRoute();
  }, [route, isLoaded]);

  const renderRoute = () => {
    try {
      console.log('📋 Route data received:', route);
      console.log('📊 Route type:', typeof route);
      console.log('🔍 Route keys:', route ? Object.keys(route) : 'No route');

      // FIXED: Don't try to unwrap - route should already be DirectionsResult
      let directionsResult = route;

      // Basic validation
      if (!directionsResult) {
        throw new Error('No route data provided');
      }

      if (!directionsResult.routes || !Array.isArray(directionsResult.routes)) {
        throw new Error('Invalid route structure: missing routes array');
      }

      if (directionsResult.routes.length === 0) {
        throw new Error('No routes found in route data');
      }

      if (directionsResult.status && directionsResult.status !== 'OK') {
        throw new Error(`Route status: ${directionsResult.status}`);
      }

      console.log('✅ Route validation passed');
      console.log('📈 Route details:', {
        status: directionsResult.status,
        routeCount: directionsResult.routes.length,
        firstRouteBounds: directionsResult.routes[0].bounds,
        firstRouteLegs: directionsResult.routes[0].legs?.length
      });

      // Clear existing renderer
      if (directionsRendererRef.current) {
        console.log('🧹 Clearing existing route renderer');
        directionsRendererRef.current.setMap(null);
      }

      // Create new directions renderer
      console.log('🎨 Creating new DirectionsRenderer...');
      const renderer = new window.google.maps.DirectionsRenderer({
        draggable: false,
        polylineOptions: {
          strokeColor: '#2563eb', // Blue color
          strokeWeight: 5,
          strokeOpacity: 0.8,
        },
        suppressMarkers: false, // Show start/end markers
        preserveViewport: false, // Allow fitting bounds
      });

      // Set map and directions
      renderer.setMap(mapInstanceRef.current);
      
      console.log('🎯 Setting directions on renderer...');
      renderer.setDirections(directionsResult);
      
      directionsRendererRef.current = renderer;

      // Fit bounds if available
      if (directionsResult.routes[0]?.bounds) {
        console.log('📏 Fitting map bounds to route');
        mapInstanceRef.current.fitBounds(directionsResult.routes[0].bounds);
      }

      console.log('🎉 Route rendered successfully!');

    } catch (err) {
      console.error('❌ Route rendering failed:', err);
      console.error('📋 Failed route data:', route);
      setError(`Route rendering failed: ${err.message}`);
    }
  };

  if (error) {
    return (
      <div className={`${className} flex items-center justify-center bg-red-50 text-red-600 p-4 rounded-lg border border-red-200`}>
        <div className="text-center">
          <div className="mb-3">
            <svg className="w-12 h-12 mx-auto text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.351 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <p className="font-medium mb-2">Failed to load map</p>
          <p className="text-sm mb-3">{error}</p>
          <button
            onClick={() => {
              setError(null);
              window.location.reload();
            }}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <div 
        ref={mapRef} 
        className={className}
        style={{ 
          minHeight: '400px',
          backgroundColor: '#f5f5f5'
        }}
      />
      
      {/* Loading overlay */}
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 bg-opacity-75 rounded-lg">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <p className="text-gray-600">Loading map...</p>
          </div>
        </div>
      )}
      
      {/* Route indicator */}
      {route && isLoaded && (
        <div className="absolute top-2 left-2 bg-white rounded-lg shadow-lg px-3 py-2 text-sm z-10">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
            <span className="text-gray-700">Route Active</span>
          </div>
        </div>
      )}
      
      {/* Debug overlay - remove in production */}
      <div className="absolute bottom-2 left-2 bg-black bg-opacity-70 text-white text-xs p-2 rounded z-10">
        <div>Map: {isLoaded ? '✅' : '❌'}</div>
        <div>Route: {route ? '✅' : '❌'}</div>
        <div>Renderer: {directionsRendererRef.current ? '✅' : '❌'}</div>
        {route && <div>Status: {route.status || 'Unknown'}</div>}
      </div>
    </div>
  );
};

export default GoogleMap;