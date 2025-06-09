// src/components/maps/GoogleMap.jsx - FIXED VERSION to prevent multiple API loads
import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
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
  const markersRef = useRef([]);
  
  const [isLoaded, setIsLoaded] = useState(false);
  const [apiLoaded, setApiLoaded] = useState(false);
  const [error, setError] = useState(null);

  // Memoize center to prevent unnecessary re-renders
  const memoizedCenter = useMemo(() => center, [center?.lat, center?.lng]);
  
  // Memoize route info to prevent unnecessary re-renders
  const memoizedRouteInfo = useMemo(() => routeInfo, [
    routeInfo?.isFlightRoute,
    routeInfo?.routeType,
    JSON.stringify(routeInfo?.coordinates)
  ]);

  // Load Google Maps API only once
  useEffect(() => {
    let isMounted = true;
    
    const loadAPI = async () => {
      try {
        console.log('🗺️ GoogleMap: Checking API status...');
        
        // Check if already loaded
        if (window.google?.maps) {
          console.log('✅ GoogleMap: API already available');
          if (isMounted) {
            setApiLoaded(true);
          }
          return;
        }

        console.log('📦 GoogleMap: Loading Google Maps API...');
        await googleMapsService.loadGoogleMaps();
        
        if (isMounted) {
          console.log('✅ GoogleMap: API loaded successfully');
          setApiLoaded(true);
        }
      } catch (err) {
        console.error('❌ GoogleMap: Failed to load API:', err);
        if (isMounted) {
          setError(`Failed to load Google Maps: ${err.message}`);
        }
      }
    };

    loadAPI();

    return () => {
      isMounted = false;
    };
  }, []); // Empty dependency array - load only once

  // Initialize map when API is loaded and ref is available
  useEffect(() => {
    if (!apiLoaded || !mapRef.current || mapInstanceRef.current) {
      return;
    }

    console.log('🗺️ GoogleMap: Initializing map...');

    try {
      const map = new window.google.maps.Map(mapRef.current, {
        center: memoizedCenter,
        zoom,
        mapTypeControl: true,
        streetViewControl: true,
        fullscreenControl: true,
        zoomControl: true,
      });

      mapInstanceRef.current = map;
      
      // Add click listener if provided
      if (onMapClick) {
        map.addListener('click', onMapClick);
      }

      // Wait for map to be ready
      const checkMapReady = () => {
        if (map.getDiv() && map.getDiv().offsetWidth > 0) {
          console.log('✅ GoogleMap: Map initialized and ready');
          setIsLoaded(true);
        } else {
          setTimeout(checkMapReady, 100);
        }
      };
      
      checkMapReady();

    } catch (err) {
      console.error('❌ GoogleMap: Map initialization failed:', err);
      setError(`Map initialization failed: ${err.message}`);
    }
  }, [apiLoaded, memoizedCenter, zoom, onMapClick]);

  // Handle route rendering
  useEffect(() => {
    if (!isLoaded || !mapInstanceRef.current || !route) {
      return;
    }

    console.log('🛣️ GoogleMap: Rendering route...');

    const isFlightRoute = memoizedRouteInfo?.isFlightRoute || memoizedRouteInfo?.routeType === 'flight';
    
    if (isFlightRoute) {
      renderFlightRoute();
    } else {
      renderDrivingRoute();
    }
  }, [route, memoizedRouteInfo, isLoaded]);

  // Handle markers
  useEffect(() => {
    if (!isLoaded || !mapInstanceRef.current) {
      return;
    }

    console.log('📍 GoogleMap: Updating markers...');
    
    // Clear existing markers
    clearMarkers();

    // Add new markers
    markers.forEach(markerData => {
      const marker = new window.google.maps.Marker({
        position: markerData.position,
        map: mapInstanceRef.current,
        title: markerData.title,
        icon: markerData.icon
      });
      markersRef.current.push(marker);
    });

  }, [markers, isLoaded]);

  // Clear markers helper
  const clearMarkers = useCallback(() => {
    markersRef.current.forEach(marker => {
      if (marker && marker.setMap) {
        marker.setMap(null);
      }
    });
    markersRef.current = [];
  }, []);

  // Clear flight paths helper
  const clearFlightPaths = useCallback(() => {
    console.log('🧹 Clearing existing flight paths, count:', flightPathRef.current.length);
    flightPathRef.current.forEach(item => {
      if (item && item.setMap) {
        item.setMap(null);
      }
    });
    flightPathRef.current = [];
  }, []);

  const renderDrivingRoute = useCallback(() => {
    try {
      console.log('🚗 Rendering driving route...');
      
      // Clear any existing flight paths and markers
      clearFlightPaths();
      clearMarkers();

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
  }, [route, clearFlightPaths, clearMarkers]);

  const renderFlightRoute = useCallback(() => {
    try {
      console.log('✈️ Rendering flight route...');
      
      // Clear existing driving route
      if (directionsRendererRef.current) {
        directionsRendererRef.current.setMap(null);
      }

      clearFlightPaths();

      // Use coordinates from routeInfo
      if (memoizedRouteInfo?.coordinates && memoizedRouteInfo.coordinates.length >= 2) {
        console.log('✅ Using coordinates from routeInfo:', memoizedRouteInfo.coordinates);
        
        // Create flight path segments between consecutive coordinates
        for (let i = 0; i < memoizedRouteInfo.coordinates.length - 1; i++) {
          const start = memoizedRouteInfo.coordinates[i];
          const end = memoizedRouteInfo.coordinates[i + 1];
          
          console.log(`Creating flight segment ${i + 1}: from`, start, 'to', end);
          
          // Validate coordinates
          if (!start.lat || !start.lng || !end.lat || !end.lng) {
            console.error('Invalid coordinates:', { start, end });
            continue;
          }

          // Create the flight path polyline with dotted pattern
          const flightPath = new window.google.maps.Polyline({
            path: [
              { lat: start.lat, lng: start.lng },
              { lat: end.lat, lng: end.lng }
            ],
            geodesic: true,
            strokeColor: '#ff6b35',
            strokeOpacity: 0,  // Make the main line invisible
            strokeWeight: 1,   // Minimal weight for the invisible line
            icons: [{
              icon: {
                path: 'M 0,-2 0,2',  // Vertical line for dash
                strokeOpacity: 1,
                strokeColor: '#ff6b35',
                strokeWeight: 4,
                scale: 2
              },
              offset: '0',
              repeat: '20px'  // Distance between dashes
            }]
          });

          flightPath.setMap(mapInstanceRef.current);
          flightPathRef.current.push(flightPath);
          
          console.log(`✅ Created flight path segment ${i + 1}`);
        }

        // Add markers for start and end points
        const startCoord = memoizedRouteInfo.coordinates[0];
        const endCoord = memoizedRouteInfo.coordinates[memoizedRouteInfo.coordinates.length - 1];

        // Create airplane icon
        const airplaneIcon = {
          url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="12" cy="12" r="12" fill="white" fill-opacity="0.9"/>
              <path d="M21 16V14L13 9V3.5C13 2.67 12.33 2 11.5 2S10 2.67 10 3.5V9L2 14V16L10 13.5V19L8 20.5V22L11.5 21L15 22V20.5L13 19V13.5L21 16Z" fill="#ff6b35"/>
            </svg>
          `),
          scaledSize: new window.google.maps.Size(32, 32),
          anchor: new window.google.maps.Point(16, 16)
        };

        // Start marker
        const startMarker = new window.google.maps.Marker({
          position: { lat: startCoord.lat, lng: startCoord.lng },
          map: mapInstanceRef.current,
          title: `Departure: ${startCoord.formatted_address || 'Origin'}`,
          icon: airplaneIcon
        });
        flightPathRef.current.push(startMarker);

        // End marker
        const endMarker = new window.google.maps.Marker({
          position: { lat: endCoord.lat, lng: endCoord.lng },
          map: mapInstanceRef.current,
          title: `Arrival: ${endCoord.formatted_address || 'Destination'}`,
          icon: airplaneIcon
        });
        flightPathRef.current.push(endMarker);

        // Waypoint markers
        for (let i = 1; i < memoizedRouteInfo.coordinates.length - 1; i++) {
          const waypoint = memoizedRouteInfo.coordinates[i];
          const waypointMarker = new window.google.maps.Marker({
            position: { lat: waypoint.lat, lng: waypoint.lng },
            map: mapInstanceRef.current,
            title: `Waypoint: ${waypoint.formatted_address || `Stop ${i}`}`,
            icon: airplaneIcon
          });
          flightPathRef.current.push(waypointMarker);
        }

        // Fit bounds to show entire flight route
        if (memoizedRouteInfo.bounds) {
          console.log('Setting bounds for flight route:', memoizedRouteInfo.bounds);
          const bounds = new window.google.maps.LatLngBounds();
          bounds.extend({ lat: memoizedRouteInfo.bounds.south, lng: memoizedRouteInfo.bounds.west });
          bounds.extend({ lat: memoizedRouteInfo.bounds.north, lng: memoizedRouteInfo.bounds.east });
          mapInstanceRef.current.fitBounds(bounds);
        } else if (route.routes?.[0]?.bounds) {
          mapInstanceRef.current.fitBounds(route.routes[0].bounds);
        }

        console.log('✅ Flight route rendered successfully with', memoizedRouteInfo.coordinates.length, 'points');

      } else {
        // Fallback: try to extract from route legs (old method)
        console.warn('⚠️ No coordinates in routeInfo, trying fallback method');
        renderFlightRouteFallback();
      }

    } catch (err) {
      console.error('❌ Flight route rendering failed:', err);
      setError(`Flight route rendering failed: ${err.message}`);
    }
  }, [memoizedRouteInfo, route, clearFlightPaths]);

  // Fallback method for rendering flight routes (in case coordinates are not in routeInfo)
  const renderFlightRouteFallback = useCallback(() => {
    try {
      console.log('📦 Using fallback flight rendering method');
      
      if (!route.routes || !route.routes[0] || !route.routes[0].legs) {
        throw new Error('Invalid route structure for fallback method');
      }

      const legs = route.routes[0].legs;
      console.log('Flight route legs:', legs.length);
      
      legs.forEach((leg, index) => {
        console.log(`Processing flight leg ${index + 1}:`, leg);
        
        let start, end;
        
        try {
          // Extract start coordinates
          if (typeof leg.start_location?.lat === 'function') {
            start = {
              lat: leg.start_location.lat(),
              lng: leg.start_location.lng()
            };
          } else if (typeof leg.start_location?.lat === 'number') {
            start = {
              lat: leg.start_location.lat,
              lng: leg.start_location.lng
            };
          } else {
            throw new Error('Could not extract start coordinates');
          }

          // Extract end coordinates
          if (typeof leg.end_location?.lat === 'function') {
            end = {
              lat: leg.end_location.lat(),
              lng: leg.end_location.lng()
            };
          } else if (typeof leg.end_location?.lat === 'number') {
            end = {
              lat: leg.end_location.lat,
              lng: leg.end_location.lng
            };
          } else {
            throw new Error('Could not extract end coordinates');
          }

          console.log(`✅ Fallback coordinates for segment ${index + 1}:`, { start, end });
          
          // Create flight path with dotted pattern
          const flightPath = new window.google.maps.Polyline({
            path: [start, end],
            geodesic: true,
            strokeColor: '#ff6b35',
            strokeOpacity: 0,  // Make the main line invisible
            strokeWeight: 1,   // Minimal weight for the invisible line
            icons: [{
              icon: {
                path: 'M 0,-2 0,2',  // Vertical line for dash
                strokeOpacity: 1,
                strokeColor: '#ff6b35',
                strokeWeight: 4,
                scale: 2
              },
              offset: '0',
              repeat: '20px'  // Distance between dashes
            }]
          });

          flightPath.setMap(mapInstanceRef.current);
          flightPathRef.current.push(flightPath);
          
        } catch (coordError) {
          console.error(`❌ Fallback coordinate extraction failed for leg ${index + 1}:`, coordError);
        }
      });

    } catch (err) {
      console.error('❌ Fallback flight rendering failed:', err);
    }
  }, [route]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearFlightPaths();
      clearMarkers();
      if (directionsRendererRef.current) {
        directionsRendererRef.current.setMap(null);
      }
    };
  }, [clearFlightPaths, clearMarkers]);

  if (error) {
    return (
      <div className={`${className} flex items-center justify-center bg-red-50 text-red-600 p-4 rounded-lg border border-red-200`}>
        <div className="text-center">
          <p className="font-medium mb-2">Failed to load map</p>
          <p className="text-sm mb-3">{error}</p>
          <button
            onClick={() => {
              setError(null);
              setApiLoaded(false);
              setIsLoaded(false);
              // Reset the Google Maps service
              googleMapsService.reset();
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
              {!apiLoaded ? 'Loading Google Maps API...' : 'Initializing map...'}
            </p>
          </div>
        </div>
      )}
      
      {/* Route type indicator */}
      {route && isLoaded && (
        <div className="absolute top-2 left-2 bg-white rounded-lg shadow-lg px-3 py-2 text-sm z-10">
          <div className="flex items-center gap-2">
            {memoizedRouteInfo?.isFlightRoute ? (
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
      {route && memoizedRouteInfo?.isFlightRoute && isLoaded && (
        <div className="absolute bottom-2 left-2 bg-orange-50 border border-orange-200 rounded-lg px-3 py-2 text-xs z-10 max-w-xs">
          <div className="text-orange-800">
            <div className="font-medium">Flight Route Debug:</div>
            <div>Coordinates: {memoizedRouteInfo.coordinates?.length || 0}</div>
            <div>Paths rendered: {flightPathRef.current.length}</div>
            <div>Has bounds: {memoizedRouteInfo.bounds ? 'Yes' : 'No'}</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GoogleMap;