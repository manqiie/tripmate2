// src/components/maps/GoogleMap.jsx - FIXED VERSION for flight routes
import React, { useEffect, useRef, useState } from 'react';
import googleMapsService from '../../services/googleMaps';

const GoogleMap = ({ 
  center = { lat: 3.1390, lng: 101.6869 },
  zoom = 10, 
  route = null,
  routeInfo = null,
  markers = [],
  onMapClick = null,
  className = "w-full h-96"
}) => {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const directionsRendererRef = useRef(null);
  const flightPathRef = useRef([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [apiLoaded, setApiLoaded] = useState(false);
  const [error, setError] = useState(null);

  // Load Google Maps API first
  useEffect(() => {
    const loadAPI = async () => {
      try {
        await googleMapsService.loadGoogleMaps();
        setApiLoaded(true);
      } catch (err) {
        setError(`Failed to load Google Maps: ${err.message}`);
      }
    };

    if (!window.google?.maps) {
      loadAPI();
    } else {
      setApiLoaded(true);
    }
  }, []);

  // Initialize map after API is loaded
  useEffect(() => {
    if (!apiLoaded) return;

    const initMap = () => {
      if (!mapRef.current || !window.google?.maps) return;

      try {
        const map = new window.google.maps.Map(mapRef.current, {
          center,
          zoom,
          mapTypeControl: true,
          streetViewControl: true,
          fullscreenControl: true,
          zoomControl: true,
        });

        mapInstanceRef.current = map;
        
        const checkMapReady = () => {
          if (map.getDiv() && map.getDiv().offsetWidth > 0) {
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
        setError(err.message);
      }
    };

    initMap();
  }, [apiLoaded, center, zoom, onMapClick]);

  // Render route when ready
  useEffect(() => {
    if (!isLoaded || !mapInstanceRef.current || !route) return;

    const isFlightRoute = routeInfo?.isFlightRoute || routeInfo?.routeType === 'flight';
    
    if (isFlightRoute) {
      renderFlightRoute();
    } else {
      renderDrivingRoute();
    }
  }, [route, routeInfo, isLoaded]);

  const renderDrivingRoute = () => {
    try {
      console.log('🚗 Rendering driving route...');
      
      // Clear any existing flight paths
      clearFlightPaths();

      // Use standard DirectionsRenderer for driving routes
      if (directionsRendererRef.current) {
        directionsRendererRef.current.setMap(null);
      }

      const renderer = new window.google.maps.DirectionsRenderer({
        draggable: false,
        polylineOptions: {
          strokeColor: '#2563eb',
          strokeWeight: 5,
          strokeOpacity: 0.8,
        },
        suppressMarkers: false,
        preserveViewport: false,
      });

      renderer.setMap(mapInstanceRef.current);
      renderer.setDirections(route);
      directionsRendererRef.current = renderer;

      if (route.routes[0]?.bounds) {
        mapInstanceRef.current.fitBounds(route.routes[0].bounds);
      }

      console.log('✅ Driving route rendered successfully');

    } catch (err) {
      console.error('❌ Driving route rendering failed:', err);
      setError(`Driving route rendering failed: ${err.message}`);
    }
  };

  const renderFlightRoute = () => {
    try {
      console.log('✈️ Rendering flight route...');
      
      // Clear existing driving route
      if (directionsRendererRef.current) {
        directionsRendererRef.current.setMap(null);
      }

      clearFlightPaths();

      if (!route.routes || !route.routes[0] || !route.routes[0].legs) {
        throw new Error('Invalid flight route data structure');
      }

      const legs = route.routes[0].legs;
      console.log('Flight route legs:', legs.length);
      
      // Create flight path segments and markers
      legs.forEach((leg, index) => {
        console.log(`Processing flight leg ${index + 1}:`, leg);
        
        // Extract coordinates with multiple fallback methods
        let start, end;
        
        try {
          // Method 1: Function calls (Google Maps LatLng objects)
          if (leg.start_location.lat && typeof leg.start_location.lat === 'function') {
            start = {
              lat: leg.start_location.lat(),
              lng: leg.start_location.lng()
            };
          }
          // Method 2: Direct object properties
          else if (typeof leg.start_location.lat === 'number') {
            start = {
              lat: leg.start_location.lat,
              lng: leg.start_location.lng
            };
          }
          // Method 3: Nested lat/lng objects
          else if (leg.start_location.lat?.lat) {
            start = {
              lat: leg.start_location.lat.lat,
              lng: leg.start_location.lng.lng
            };
          }
          else {
            throw new Error('Could not extract start coordinates');
          }

          // Same for end location
          if (leg.end_location.lat && typeof leg.end_location.lat === 'function') {
            end = {
              lat: leg.end_location.lat(),
              lng: leg.end_location.lng()
            };
          }
          else if (typeof leg.end_location.lat === 'number') {
            end = {
              lat: leg.end_location.lat,
              lng: leg.end_location.lng
            };
          }
          else if (leg.end_location.lat?.lat) {
            end = {
              lat: leg.end_location.lat.lat,
              lng: leg.end_location.lng.lng
            };
          }
          else {
            throw new Error('Could not extract end coordinates');
          }

          console.log(`✅ Flight segment ${index + 1}: from`, start, 'to', end);
          
          // Validate coordinates
          if (isNaN(start.lat) || isNaN(start.lng) || isNaN(end.lat) || isNaN(end.lng)) {
            throw new Error('Invalid coordinates extracted');
          }
          
        } catch (coordError) {
          console.error(`❌ Failed to extract coordinates for leg ${index + 1}:`, coordError);
          console.log('Raw leg data:', leg);
          return; // Skip this leg
        }

        // Create the dotted flight path polyline with enhanced visibility
        const flightPath = new window.google.maps.Polyline({
          path: [start, end],
          geodesic: true,
          strokeColor: '#ff6b35',
          strokeOpacity: 0.3,  // Visible background line
          strokeWeight: 8,     // Thick base line
          icons: [{
            icon: {
              path: 'M 0,-4 0,4',  // Even larger dash
              strokeOpacity: 1,
              strokeColor: '#ff6b35',
              strokeWeight: 6,
              scale: 3  // Much bigger dashes
            },
            offset: '0',
            repeat: '25px'  // More space between dashes
          }]
        });

        flightPath.setMap(mapInstanceRef.current);
        flightPathRef.current.push(flightPath);
        
        console.log(`✅ Created flight path polyline for segment ${index + 1}`);

        // Create airplane icon SVG
        const airplaneIcon = {
          url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M21 16V14L13 9V3.5C13 2.67 12.33 2 11.5 2S10 2.67 10 3.5V9L2 14V16L10 13.5V19L8 20.5V22L11.5 21L15 22V20.5L13 19V13.5L21 16Z" fill="#ff6b35"/>
              <circle cx="12" cy="12" r="12" fill="white" fill-opacity="0.8"/>
              <path d="M21 16V14L13 9V3.5C13 2.67 12.33 2 11.5 2S10 2.67 10 3.5V9L2 14V16L10 13.5V19L8 20.5V22L11.5 21L15 22V20.5L13 19V13.5L21 16Z" fill="#ff6b35"/>
            </svg>
          `),
          scaledSize: new window.google.maps.Size(32, 32),
          anchor: new window.google.maps.Point(16, 16)
        };

        // Add start marker (airport)
        const startMarker = new window.google.maps.Marker({
          position: start,
          map: mapInstanceRef.current,
          title: `Departure: ${leg.start_address}`,
          icon: airplaneIcon
        });

        flightPathRef.current.push(startMarker);

        // Add end marker for the last leg
        if (index === legs.length - 1) {
          const endMarker = new window.google.maps.Marker({
            position: end,
            map: mapInstanceRef.current,
            title: `Arrival: ${leg.end_address}`,
            icon: airplaneIcon
          });
          flightPathRef.current.push(endMarker);
        }
      });

      // Fit bounds to show entire flight route
      if (route.routes[0]?.bounds) {
        console.log('Setting bounds for flight route');
        mapInstanceRef.current.fitBounds(route.routes[0].bounds);
      }

      console.log('✅ Flight route rendered successfully with', legs.length, 'segments');

    } catch (err) {
      console.error('❌ Flight route rendering failed:', err);
      setError(`Flight route rendering failed: ${err.message}`);
    }
  };

  const clearFlightPaths = () => {
    console.log('🧹 Clearing existing flight paths, count:', flightPathRef.current.length);
    flightPathRef.current.forEach(item => {
      if (item && item.setMap) {
        item.setMap(null);
      }
    });
    flightPathRef.current = [];
  };

  if (error) {
    return (
      <div className={`${className} flex items-center justify-center bg-red-50 text-red-600 p-4 rounded-lg border border-red-200`}>
        <div className="text-center">
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
      {(!apiLoaded || !isLoaded) && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 bg-opacity-75 rounded-lg">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <p className="text-gray-600">
              {!apiLoaded ? 'Loading Google Maps...' : 'Initializing map...'}
            </p>
          </div>
        </div>
      )}
      
      {/* Route type indicator */}
      {route && isLoaded && (
        <div className="absolute top-2 left-2 bg-white rounded-lg shadow-lg px-3 py-2 text-sm z-10">
          <div className="flex items-center gap-2">
            {routeInfo?.isFlightRoute ? (
              <>
                <div className="w-3 h-3 bg-orange-500 rounded-full animate-pulse"></div>
                <span className="text-gray-700 font-medium">✈️ Flight Route</span>
              </>
            ) : (
              <>
                <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
                <span className="text-gray-700 font-medium">🚗 Driving Route</span>
              </>
            )}
          </div>
        </div>
      )}

      {/* Debug info for flight routes */}
      {route && routeInfo?.isFlightRoute && isLoaded && (
        <div className="absolute bottom-2 left-2 bg-orange-50 border border-orange-200 rounded-lg px-3 py-2 text-xs z-10 max-w-xs">
          <div className="text-orange-800">
            <div className="font-medium">Flight Route Debug:</div>
            <div>Legs: {route.routes?.[0]?.legs?.length || 0}</div>
            <div>Paths rendered: {flightPathRef.current.length}</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GoogleMap;