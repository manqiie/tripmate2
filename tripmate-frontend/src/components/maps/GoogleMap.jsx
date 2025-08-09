// Enhanced GoogleMap.jsx with POI click handler integration - Complete version
import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import googleMapsService from '../../services/googleMaps';
import { usePOIClickHandler } from './POIClickHandler';

const GoogleMap = ({ 
  center = { lat: 3.1390, lng: 101.6869 },
  zoom = 10, 
  route = null,
  routeInfo = null,
  markers = [],
  bookmarkedPlaces = [], // Bookmarked places to show
  onMapClick = null,
  onPlaceClick = null, // Callback when a place is clicked
  onBookmarkPlace = null, // Callback to bookmark a place from nearby results
  showBookmarks = true, // Toggle bookmark visibility
  nearbyPlaces = [], // For showing category search results
  selectedCategory = null, // Current category being searched
  className = "w-full h-96",
  // POI Click props
  enablePOIClick = false,
  currentStopIndex = 0,
  tripId = null,
  onSavePlaceToTrip = null
}) => {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const directionsRendererRef = useRef(null);
  const flightPathRef = useRef([]);
  const markersRef = useRef([]);
  const bookmarkMarkersRef = useRef([]); // Bookmark markers
  const nearbyMarkersRef = useRef([]); // For category search results
  
  const [isLoaded, setIsLoaded] = useState(false);
  const [apiLoaded, setApiLoaded] = useState(false);
  const [error, setError] = useState(null);

  // Initialize POI click handler
  const poiHandler = usePOIClickHandler();

  // Memoize center to prevent unnecessary re-renders
  const memoizedCenter = useMemo(() => center, [center?.lat, center?.lng]);
  
  // Memoize route info to prevent unnecessary re-renders
  const memoizedRouteInfo = useMemo(() => routeInfo, [
    routeInfo?.isFlightRoute,
    routeInfo?.routeType,
    JSON.stringify(routeInfo?.coordinates)
  ]);

  // Memoize bookmarked places to prevent unnecessary re-renders
  const memoizedBookmarkedPlaces = useMemo(() => bookmarkedPlaces, [
    JSON.stringify(bookmarkedPlaces?.map(p => ({ id: p.id, location: p.location })))
  ]);

  // Memoize nearby places to prevent unnecessary re-renders
  const memoizedNearbyPlaces = useMemo(() => nearbyPlaces, [
    JSON.stringify(nearbyPlaces?.map(p => ({ id: p.id, location: p.location })))
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
        keyboardShortcuts: false,
        clickableIcons: enablePOIClick, // Enable/disable POI clicks
      });

      mapInstanceRef.current = map;
      
      // Add regular click listener if provided
      if (onMapClick) {
        map.addListener('click', onMapClick);
      }

      // Initialize POI click handler
      if (enablePOIClick && onSavePlaceToTrip) {
        poiHandler.initialize(map, {
          enabled: enablePOIClick,
          currentStopIndex,
          tripId,
          onSavePlaceToTrip
        });
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
  }, [apiLoaded, memoizedCenter, zoom, onMapClick, enablePOIClick, onSavePlaceToTrip, currentStopIndex, tripId, poiHandler]);

  // Update POI handler when props change
  useEffect(() => {
    if (mapInstanceRef.current && enablePOIClick && onSavePlaceToTrip) {
      poiHandler.update({
        enabled: enablePOIClick,
        currentStopIndex,
        tripId,
        onSavePlaceToTrip
      });
    }
  }, [enablePOIClick, currentStopIndex, tripId, onSavePlaceToTrip, poiHandler]);

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

  // Handle regular markers
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

  // Handle bookmark markers with click functionality
  useEffect(() => {
    if (!isLoaded || !mapInstanceRef.current || !showBookmarks) {
      clearBookmarkMarkers();
      return;
    }

    console.log('⭐ GoogleMap: Updating bookmark markers...');
    
    // Clear existing bookmark markers
    clearBookmarkMarkers();

    // Add bookmark markers
    memoizedBookmarkedPlaces.forEach(place => {
      if (place.location && place.location.lat && place.location.lng) {
        const bookmarkIcon = createBookmarkIcon();

        const marker = new window.google.maps.Marker({
          position: place.location,
          map: mapInstanceRef.current,
          title: place.name,
          icon: bookmarkIcon,
          zIndex: 1000 // Higher z-index to appear above other markers
        });

        // Create info window for bookmark
        const infoWindow = new window.google.maps.InfoWindow({
          content: createBookmarkInfoWindowContent(place)
        });

        // Add click listener for bookmark
        marker.addListener('click', () => {
          // Close other info windows
          bookmarkMarkersRef.current.forEach(({ infoWindow: iw }) => {
            if (iw) iw.close();
          });
          nearbyMarkersRef.current.forEach(({ infoWindow: iw }) => {
            if (iw) iw.close();
          });
          
          // Open this info window
          infoWindow.open(mapInstanceRef.current, marker);
          
          // Center map on this place
          mapInstanceRef.current.setCenter(place.location);
          mapInstanceRef.current.setZoom(Math.max(mapInstanceRef.current.getZoom(), 15));
          
          // Trigger callback
          if (onPlaceClick) {
            onPlaceClick(place);
          }
        });

        bookmarkMarkersRef.current.push({ marker, infoWindow, place });
      }
    });

  }, [memoizedBookmarkedPlaces, isLoaded, showBookmarks, onPlaceClick]);

  // Handle nearby places (category search results)
  useEffect(() => {
    if (!isLoaded || !mapInstanceRef.current) {
      clearNearbyMarkers();
      return;
    }

    console.log('🔍 GoogleMap: Updating nearby places markers...');

    clearNearbyMarkers();

    memoizedNearbyPlaces.forEach(place => {
      if (place.location && place.location.lat && place.location.lng) {
        const nearbyIcon = createCategoryIcon(selectedCategory);

        const marker = new window.google.maps.Marker({
          position: place.location,
          map: mapInstanceRef.current,
          title: place.name,
          icon: nearbyIcon,
          zIndex: 900
        });

        const infoWindow = new window.google.maps.InfoWindow({
          content: createNearbyPlaceInfoWindowContent(place)
        });

        // Add click listener for nearby place
        marker.addListener('click', () => {
          // Close other info windows
          nearbyMarkersRef.current.forEach(({ infoWindow: iw }) => {
            if (iw) iw.close();
          });
          bookmarkMarkersRef.current.forEach(({ infoWindow: iw }) => {
            if (iw) iw.close();
          });
          
          // Open this info window
          infoWindow.open(mapInstanceRef.current, marker);
          
          // Center map on this place
          mapInstanceRef.current.setCenter(place.location);
          mapInstanceRef.current.setZoom(Math.max(mapInstanceRef.current.getZoom(), 16));
          
          // Trigger callback
          if (onPlaceClick) {
            onPlaceClick(place);
          }
        });

        nearbyMarkersRef.current.push({ marker, infoWindow, place });
      }
    });
  }, [memoizedNearbyPlaces, selectedCategory, isLoaded, onPlaceClick]);

  // Navigate to a specific place
  const navigateToPlace = useCallback((place) => {
    if (!mapInstanceRef.current || !place.location) return;
    
    console.log('🧭 Navigating to place:', place.name);
    
    // Animate to the place
    mapInstanceRef.current.panTo(place.location);
    mapInstanceRef.current.setZoom(16);
    
    // Find and open the info window for this place
    const bookmarkMarker = bookmarkMarkersRef.current.find(bm => bm.place.id === place.id);
    if (bookmarkMarker) {
      // Close all other info windows
      [...bookmarkMarkersRef.current, ...nearbyMarkersRef.current].forEach(({ infoWindow }) => {
        if (infoWindow) infoWindow.close();
      });
      
      // Open this marker's info window
      bookmarkMarker.infoWindow.open(mapInstanceRef.current, bookmarkMarker.marker);
    }
  }, []);

  // Expose navigate function to parent component
  useEffect(() => {
    if (onPlaceClick) {
      window.navigateToPlace = navigateToPlace;
    }
    return () => {
      delete window.navigateToPlace;
    };
  }, [navigateToPlace, onPlaceClick]);

  // Create bookmark icon
  const createBookmarkIcon = () => ({
    url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12" r="12" fill="white" stroke="#fbbf24" stroke-width="2"/>
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="#fbbf24" stroke="#f59e0b" stroke-width="1"/>
      </svg>
    `),
    scaledSize: new window.google.maps.Size(32, 32),
    anchor: new window.google.maps.Point(16, 16)
  });

  // Create category-specific icons
  const createCategoryIcon = (category) => {
    const categoryIcons = {
      restaurant: { color: '#ef4444', emoji: '🍽️' },
      lodging: { color: '#3b82f6', emoji: '🏨' },
      tourist_attraction: { color: '#10b981', emoji: '🎯' },
      shopping_mall: { color: '#8b5cf6', emoji: '🛍️' },
      hospital: { color: '#f59e0b', emoji: '🏥' },
      gas_station: { color: '#06b6d4', emoji: '⛽' },
      default: { color: '#6b7280', emoji: '📍' }
    };

    const config = categoryIcons[category] || categoryIcons.default;

    return {
      url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="11" fill="white" stroke="${config.color}" stroke-width="2"/>
          <text x="12" y="16" text-anchor="middle" font-size="12">${config.emoji}</text>
        </svg>
      `),
      scaledSize: new window.google.maps.Size(28, 28),
      anchor: new window.google.maps.Point(14, 14)
    };
  };

  // Create bookmark info window content
  const createBookmarkInfoWindowContent = (place) => {
    const ratingStars = place.rating ? '⭐'.repeat(Math.floor(place.rating)) : '';
    const placeTypes = place.types ? place.types.slice(0, 2).map(type => 
      type.replace(/_/g, ' ')
    ).join(', ') : '';

    // Create Google Maps URL for the place
    const googleMapsUrl = createGoogleMapsUrl(place);

    return `
      <div style="max-width: 250px; padding: 8px;">
        <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: bold; color: #1f2937;">
          ${place.name}
        </h3>
        <p style="margin: 0 0 8px 0; font-size: 12px; color: #6b7280; line-height: 1.3;">
          ${place.address || 'Address not available'}
        </p>
        ${place.rating ? `
          <div style="margin: 4px 0; font-size: 12px; color: #374151;">
            ${ratingStars} ${place.rating.toFixed(1)} 
            ${place.userRatingsTotal ? `(${place.userRatingsTotal} reviews)` : ''}
          </div>
        ` : ''}
        ${placeTypes ? `
          <div style="margin: 4px 0;">
            <span style="background: #dbeafe; color: #1d4ed8; padding: 2px 6px; border-radius: 4px; font-size: 10px;">
              ${placeTypes}
            </span>
          </div>
        ` : ''}
        <div style="margin-top: 8px; display: flex; gap: 4px; flex-wrap: wrap;">
          <a href="${googleMapsUrl}" target="_blank" 
             style="background: #10b981; color: white; text-decoration: none; padding: 4px 8px; border-radius: 4px; font-size: 11px; display: inline-block;">
            View on Google Maps
          </a>
          ${place.website ? `
            <a href="${place.website}" target="_blank" 
               style="background: #6b7280; color: white; text-decoration: none; padding: 4px 8px; border-radius: 4px; font-size: 11px;">
              Website
            </a>
          ` : ''}
        </div>
      </div>
    `;
  };

  // Create nearby place info window content
  const createNearbyPlaceInfoWindowContent = (place) => {
    const ratingStars = place.rating ? '⭐'.repeat(Math.floor(place.rating)) : '';
    const placeTypes = place.types ? place.types.slice(0, 2).map(type => 
      type.replace(/_/g, ' ')
    ).join(', ') : '';

    // Create Google Maps URL for the nearby place
    const googleMapsUrl = createGoogleMapsUrl(place);

    return `
      <div style="max-width: 250px; padding: 8px;">
        <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: bold; color: #1f2937;">
          ${place.name}
        </h3>
        <p style="margin: 0 0 8px 0; font-size: 12px; color: #6b7280; line-height: 1.3;">
          ${place.address || place.vicinity || 'Address not available'}
        </p>
        ${place.rating ? `
          <div style="margin: 4px 0; font-size: 12px; color: #374151;">
            ${ratingStars} ${place.rating.toFixed(1)} 
            ${place.userRatingsTotal ? `(${place.userRatingsTotal} reviews)` : ''}
          </div>
        ` : ''}
        ${placeTypes ? `
          <div style="margin: 4px 0;">
            <span style="background: #dcfce7; color: #16a34a; padding: 2px 6px; border-radius: 4px; font-size: 10px;">
              ${placeTypes}
            </span>
          </div>
        ` : ''}
        <div style="margin-top: 8px; display: flex; gap: 4px; flex-wrap: wrap;">
          <button onclick="window.bookmarkNearbyPlace('${place.id}')" 
                  style="background: #f59e0b; color: white; border: none; padding: 4px 8px; border-radius: 4px; font-size: 11px; cursor: pointer;">
            ⭐ Bookmark
          </button>
          <a href="${googleMapsUrl}" target="_blank" 
             style="background: #1d4ed8; color: white; text-decoration: none; padding: 4px 8px; border-radius: 4px; font-size: 11px; display: inline-block;">
            🗺️ View on Google Maps
          </a>
          ${place.website ? `
            <a href="${place.website}" target="_blank" 
               style="background: #6b7280; color: white; text-decoration: none; padding: 4px 8px; border-radius: 4px; font-size: 11px;">
              Website
            </a>
          ` : ''}
        </div>
      </div>
    `;
  };

  // Helper function to create Google Maps URL
  const createGoogleMapsUrl = (place) => {
    const baseUrl = 'https://www.google.com/maps';
    
    // If we have a place_id (Google Places ID), use that for the most accurate link
    if (place.place_id || place.id) {
      const placeId = place.place_id || place.id;
      return `${baseUrl}/place/?q=place_id:${placeId}`;
    }
    
    // If we have coordinates, use those
    if (place.location && place.location.lat && place.location.lng) {
      const lat = place.location.lat;
      const lng = place.location.lng;
      const name = encodeURIComponent(place.name || '');
      return `${baseUrl}/search/?api=1&query=${name}&query_place_id=${lat},${lng}`;
    }
    
    // Fallback to search by name and address
    const query = encodeURIComponent(`${place.name} ${place.address || ''}`);
    return `${baseUrl}/search/?api=1&query=${query}`;
  };

  // Global functions for info window buttons
  useEffect(() => {
    window.selectBookmarkedPlace = (placeId) => {
      const bookmarkData = bookmarkMarkersRef.current.find(b => b.place.id === placeId);
      if (bookmarkData && onPlaceClick) {
        onPlaceClick(bookmarkData.place);
      }
    };

    // Function to bookmark a nearby place
    window.bookmarkNearbyPlace = (placeId) => {
      const nearbyPlace = nearbyMarkersRef.current.find(p => p.place.id === placeId);
      if (nearbyPlace && onBookmarkPlace) {
        onBookmarkPlace(nearbyPlace.place);
      }
    };

    return () => {
      delete window.selectBookmarkedPlace;
      delete window.bookmarkNearbyPlace;
    };
  }, [onPlaceClick, onBookmarkPlace]);

  // Helper functions for clearing markers
  const clearMarkers = useCallback(() => {
    markersRef.current.forEach(marker => {
      if (marker && marker.setMap) {
        marker.setMap(null);
      }
    });
    markersRef.current = [];
  }, []);

  // Clear bookmark markers helper
  const clearBookmarkMarkers = useCallback(() => {
    console.log('🧹 Clearing bookmark markers, count:', bookmarkMarkersRef.current.length);
    bookmarkMarkersRef.current.forEach(({ marker, infoWindow }) => {
      if (infoWindow) {
        infoWindow.close();
      }
      if (marker && marker.setMap) {
        marker.setMap(null);
      }
    });
    bookmarkMarkersRef.current = [];
  }, []);

  // Clear nearby markers
  const clearNearbyMarkers = useCallback(() => {
    console.log('🧹 Clearing nearby markers, count:', nearbyMarkersRef.current.length);
    nearbyMarkersRef.current.forEach(({ marker, infoWindow }) => {
      if (infoWindow) infoWindow.close();
      if (marker && marker.setMap) marker.setMap(null);
    });
    nearbyMarkersRef.current = [];
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
      clearBookmarkMarkers();
      clearNearbyMarkers();
      if (directionsRendererRef.current) {
        directionsRendererRef.current.setMap(null);
      }
    };
  }, [clearFlightPaths, clearMarkers, clearBookmarkMarkers, clearNearbyMarkers]);

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

      {/* Enhanced indicators */}
      {isLoaded && (
        <div className="absolute top-2 right-2 space-y-2 z-10">
     
          {/* Bookmarks indicator */}
          {showBookmarks && memoizedBookmarkedPlaces.length > 0 && (
            <div className="bg-white rounded-lg shadow-lg px-3 py-2 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                <span className="text-gray-700 font-medium">⭐ {memoizedBookmarkedPlaces.length} Bookmarks</span>
              </div>
            </div>
          )}
          
          {/* Category search indicator */}
          {memoizedNearbyPlaces.length > 0 && selectedCategory && (
            <div className="bg-white rounded-lg shadow-lg px-3 py-2 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-gray-700 font-medium">
                  🔍 {memoizedNearbyPlaces.length} {selectedCategory.replace(/_/g, ' ')}s
                </span>
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );
};

export default GoogleMap;