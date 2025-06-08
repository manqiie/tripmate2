// src/components/test/DirectRouteTest.jsx - Test with actual route data
import React, { useEffect, useRef, useState } from 'react';

const DirectRouteTest = () => {
  const mapRef = useRef(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [routeRendered, setRouteRendered] = useState(false);
  const [error, setError] = useState('');

  // Your actual route data structure
  const testRoute = {
    "geocoded_waypoints": [
      {
        "geocoder_status": "OK", 
        "place_id": "ChIJ0-cIvSo2zDERmWzYQPUfLiM",
        "types": ["administrative_area_level_1", "political"]
      },
      {
        "geocoder_status": "OK",
        "place_id": "ChIJ4zNA83nsyjERWehSaUaf3I8", 
        "types": ["locality", "political"]
      },
      {
        "geocoder_status": "OK",
        "place_id": "ChIJ1XsrrZfDSjARNLmpeFnkmiM",
        "types": ["locality", "political"]
      }
    ],
    "routes": [
      {
        "bounds": {
          "south": 3.13173,
          "west": 100.31401000000001,
          "north": 5.4141,
          "east": 101.68475000000001
        },
        "legs": [
          {
            "distance": {"text": "207 km", "value": 207113},
            "duration": {"text": "2 hours 17 mins", "value": 8195},
            "end_address": "Ipoh, Perak, Malaysia",
            "end_location": {"lat": 4.600510799999999, "lng": 101.0757856},
            "start_address": "Kuala Lumpur, Federal Territory of Kuala Lumpur, Malaysia", 
            "start_location": {"lat": 3.1317299, "lng": 101.6842019},
            "steps": [
              {
                "distance": {"text": "0.4 km", "value": 356},
                "duration": {"text": "1 min", "value": 61},
                "end_location": {"lat": 3.13344, "lng": 101.684069},
                "start_location": {"lat": 3.1317299, "lng": 101.6842019},
                "travel_mode": "DRIVING"
              }
            ]
          }
        ]
      }
    ],
    "status": "OK"
  };

  useEffect(() => {
    initializeTest();
  }, []);

  const initializeTest = async () => {
    try {
      console.log('🧪 Starting Direct Route Test...');
      
      // Step 1: Create map
      if (!mapRef.current) {
        setError('Map container not found');
        return;
      }

      console.log('📍 Creating map...');
      const map = new window.google.maps.Map(mapRef.current, {
        center: { lat: 3.1390, lng: 101.6869 }, // KL center
        zoom: 8,
      });

      // Step 2: Wait for map to be ready
      google.maps.event.addListenerOnce(map, 'idle', () => {
        console.log('✅ Map is ready');
        setMapLoaded(true);
        
        // Step 3: Test DirectionsRenderer immediately
        testDirectionsRenderer(map);
      });

    } catch (err) {
      console.error('❌ Test initialization failed:', err);
      setError(err.message);
    }
  };

  const testDirectionsRenderer = (map) => {
    try {
      console.log('🔄 Testing DirectionsRenderer...');
      console.log('📋 Route data:', testRoute);
      console.log('📊 Route status:', testRoute.status);
      console.log('🗺️ Routes count:', testRoute.routes?.length);
      console.log('🛣️ First route legs:', testRoute.routes?.[0]?.legs?.length);

      // Create DirectionsRenderer
      const directionsRenderer = new window.google.maps.DirectionsRenderer({
        map: map,
        polylineOptions: {
          strokeColor: '#FF0000', // Red color for visibility
          strokeWeight: 8,
          strokeOpacity: 1.0,
        },
        suppressMarkers: false,
      });

      console.log('📦 DirectionsRenderer created');

      // This is the critical line - set directions with your exact data
      console.log('🎯 Setting directions...');
      directionsRenderer.setDirections(testRoute);
      
      console.log('✅ Directions set successfully!');
      setRouteRendered(true);

      // Fit bounds to route
      if (testRoute.routes[0].bounds) {
        map.fitBounds(testRoute.routes[0].bounds);
        console.log('📏 Bounds fitted to route');
      }

    } catch (err) {
      console.error('❌ DirectionsRenderer test failed:', err);
      setError(`DirectionsRenderer failed: ${err.message}`);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
      <h3 className="text-xl font-bold text-gray-900 mb-4">🔬 Direct Route Rendering Test</h3>
      
      <div className="space-y-4">
        {/* Status indicators */}
        <div className="flex gap-4 text-sm">
          <div className={`px-3 py-1 rounded ${mapLoaded ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
            Map: {mapLoaded ? '✅ Ready' : '⏳ Loading'}
          </div>
          <div className={`px-3 py-1 rounded ${routeRendered ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
            Route: {routeRendered ? '✅ Rendered' : '⏳ Waiting'}
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-red-800 font-medium">Error:</p>
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {/* Map container */}
        <div 
          ref={mapRef}
          className="w-full h-96 border-2 border-blue-300 rounded-lg bg-gray-100"
          style={{ minHeight: '400px' }}
        >
          <div className="flex items-center justify-center h-full text-gray-500">
            Direct route test map...
          </div>
        </div>

        <div className="text-sm text-gray-600">
          <p><strong>Expected result:</strong> Red route line from KL → Ipoh → Penang</p>
          <p><strong>If this works:</strong> The problem is in your TripPlanner component, not the map rendering</p>
          <p><strong>If this fails:</strong> There's a deeper DirectionsRenderer issue</p>
        </div>
      </div>
    </div>
  );
};

export default DirectRouteTest;