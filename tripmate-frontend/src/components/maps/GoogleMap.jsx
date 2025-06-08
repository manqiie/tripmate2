// src/components/maps/GoogleMap.jsx - Enhanced with flight route support
import React, { useEffect, useRef, useState } from 'react';
import googleMapsService from '../../services/googleMaps';

const GoogleMap = ({ 
  center = { lat: 3.1390, lng: 101.6869 },
  zoom = 10, 
  route = null,
  routeInfo = null, // Pass route info to determine if it's a flight
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

      console.log('🚗 Driving route rendered');

    } catch (err) {
      console.error('❌ Driving route rendering failed:', err);
      setError(`Driving route rendering failed: ${err.message}`);
    }
  };

  const renderFlightRoute = () => {
    try {
      // Clear existing driving route
      if (directionsRendererRef.current) {
        directionsRendererRef.current.setMap(null);
      }

      clearFlightPaths();

      if (!route.routes || !route.routes[0] || !route.routes[0].legs) {
        throw new Error('Invalid flight route data');
      }

      const legs = route.routes[0].legs;
      const markers = [];
      
      // Create flight path segments
      legs.forEach((leg, index) => {
        const start = {
          lat: typeof leg.start_location.lat === 'function' ? leg.start_location.lat() : leg.start_location.lat,
          lng: typeof leg.start_location.lng === 'function' ? leg.start_location.lng() : leg.start_location.lng
        };
        
        const end = {
          lat: typeof leg.end_location.lat === 'function' ? leg.end_location.lat() : leg.end_location.lat,
          lng: typeof leg.end_location.lng === 'function' ? leg.end_location.lng() : leg.end_location.lng
        };

        // Create dotted flight path
        const flightPath = new window.google.maps.Polyline({
          path: [start, end],
          geodesic: true,
          strokeColor: '#ff6b35',
          strokeOpacity: 0.8,
          strokeWeight: 4,
          icons: [{
            icon: {
              path: 'M 0,-1 0,1',
              strokeOpacity: 1,
              scale: 2
            },
            offset: '0',
            repeat: '10px'
          }]
        });

        flightPath.setMap(mapInstanceRef.current);
        flightPathRef.current.push(flightPath);

        // Add airport markers
        const startMarker = new window.google.maps.Marker({
          position: start,
          map: mapInstanceRef.current,
          title: leg.start_address,
          icon: {
            url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M21 16V14L13 9V3.5C13 2.67 12.33 2 11.5 2S10 2.67 10 3.5V9L2 14V16L10 13.5V19L8 20.5V22L11.5 21L15 22V20.5L13 19V13.5L21 16Z" fill="#ff6b35"/>
              </svg>
            `),
            scaledSize: new window.google.maps.Size(30, 30),
            anchor: new window.google.maps.Point(15, 15)
          }
        });

        markers.push(startMarker);

        // Add end marker for the last leg
        if (index === legs.length - 1) {
          const endMarker = new window.google.maps.Marker({
            position: end,
            map: mapInstanceRef.current,
            title: leg.end_address,
            icon: {
              url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M21 16V14L13 9V3.5C13 2.67 12.33 2 11.5 2S10 2.67 10 3.5V9L2 14V16L10 13.5V19L8 20.5V22L11.5 21L15 22V20.5L13 19V13.5L21 16Z" fill="#ff6b35"/>
                </svg>
              `),
              scaledSize: new window.google.maps.Size(30, 30),
              anchor: new window.google.maps.Point(15, 15)
            }
          });
          markers.push(endMarker);
        }
      });

      // Store markers for cleanup
      flightPathRef.current.push(...markers);

      // Fit bounds to show entire flight route
      if (route.routes[0]?.bounds) {
        mapInstanceRef.current.fitBounds(route.routes[0].bounds);
      }

      console.log('✈️ Flight route rendered with dotted lines');

    } catch (err) {
      console.error('❌ Flight route rendering failed:', err);
      setError(`Flight route rendering failed: ${err.message}`);
    }
  };

  const clearFlightPaths = () => {
    flightPathRef.current.forEach(item => {
      if (item.setMap) {
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
      
      {/* Route indicator */}
      {route && isLoaded && (
        <div className="absolute top-2 left-2 bg-white rounded-lg shadow-lg px-3 py-2 text-sm z-10">
          <div className="flex items-center gap-2">
            {routeInfo?.isFlightRoute ? (
              <>
                <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                <span className="text-gray-700">Flight Route</span>
              </>
            ) : (
              <>
                <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
                <span className="text-gray-700">Driving Route</span>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default GoogleMap;