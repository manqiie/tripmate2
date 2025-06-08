// src/components/debug/FlightRouteDebug.jsx - Create this file
import React, { useState } from 'react';
import googleMapsService from '../../services/googleMaps';

const FlightRouteDebug = () => {
  const [routeData, setRouteData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const testFlightRoute = async () => {
    setLoading(true);
    setError('');
    setRouteData(null);

    try {
      console.log('🧪 Testing flight route calculation...');
      
      const result = await googleMapsService.calculateOptimizedRoute(
        'Malaysia',
        'Japan',
        []
      );

      console.log('✅ Flight route result:', result);
      setRouteData(result);

    } catch (err) {
      console.error('❌ Flight route test failed:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const inspectRouteData = () => {
    if (!routeData?.route) return null;

    const route = routeData.route;
    const legs = route.routes?.[0]?.legs || [];
    
    return {
      isFlightRoute: routeData.isFlightRoute,
      routeType: routeData.routeType,
      hasRoutes: !!route.routes?.length,
      routeCount: route.routes?.length || 0,
      legsCount: legs.length,
      firstLeg: legs[0] ? {
        startLocation: legs[0].start_location,
        endLocation: legs[0].end_location,
        startLocationType: typeof legs[0].start_location?.lat,
        endLocationType: typeof legs[0].end_location?.lat
      } : null
    };
  };

  const extractCoordinates = () => {
    if (!routeData?.route?.routes?.[0]?.legs) return [];
    
    const legs = routeData.route.routes[0].legs;
    const coordinates = [];
    
    legs.forEach((leg, index) => {
      try {
        let start, end;
        
        // Try different extraction methods
        if (typeof leg.start_location.lat === 'function') {
          start = { lat: leg.start_location.lat(), lng: leg.start_location.lng() };
        } else if (typeof leg.start_location.lat === 'number') {
          start = { lat: leg.start_location.lat, lng: leg.start_location.lng };
        } else {
          start = { error: 'Could not extract' };
        }
        
        if (typeof leg.end_location.lat === 'function') {
          end = { lat: leg.end_location.lat(), lng: leg.end_location.lng() };
        } else if (typeof leg.end_location.lat === 'number') {
          end = { lat: leg.end_location.lat, lng: leg.end_location.lng };
        } else {
          end = { error: 'Could not extract' };
        }
        
        coordinates.push({
          leg: index + 1,
          start,
          end,
          startAddress: leg.start_address,
          endAddress: leg.end_address
        });
      } catch (error) {
        coordinates.push({
          leg: index + 1,
          error: error.message
        });
      }
    });
    
    return coordinates;
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
      <h3 className="text-xl font-bold text-gray-900 mb-4">🛫 Flight Route Data Debug</h3>
      
      <div className="space-y-4">
        <button
          onClick={testFlightRoute}
          disabled={loading}
          className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:bg-gray-400"
        >
          {loading ? 'Testing Flight Route...' : 'Test Flight: Malaysia → Japan'}
        </button>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-red-800 font-medium">Error:</p>
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {routeData && (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <p className="text-green-800 font-medium">✅ Route Created Successfully!</p>
              <div className="mt-2 text-sm text-green-700">
                <p>Type: {routeData.routeType}</p>
                <p>Is Flight: {routeData.isFlightRoute ? 'Yes' : 'No'}</p>
                <p>Distance: {routeData.totalDistance} km</p>
                <p>Duration: {Math.floor(routeData.totalDuration / 60)}h {routeData.totalDuration % 60}m</p>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-blue-800 font-medium">📊 Route Structure:</p>
              <pre className="text-xs text-blue-700 mt-2 whitespace-pre-wrap">
                {JSON.stringify(inspectRouteData(), null, 2)}
              </pre>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-yellow-800 font-medium">📍 Coordinate Extraction Test:</p>
              <div className="text-xs text-yellow-700 mt-2 space-y-2">
                {extractCoordinates().map((coord, index) => (
                  <div key={index} className="border-l-2 border-yellow-400 pl-2">
                    <div className="font-medium">Leg {coord.leg}:</div>
                    {coord.error ? (
                      <div className="text-red-600">Error: {coord.error}</div>
                    ) : (
                      <div>
                        <div>Start: {coord.start.error || `${coord.start.lat}, ${coord.start.lng}`}</div>
                        <div>End: {coord.end.error || `${coord.end.lat}, ${coord.end.lng}`}</div>
                        <div className="text-gray-600 text-xs">
                          {coord.startAddress} → {coord.endAddress}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <details className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <summary className="text-gray-800 font-medium cursor-pointer">
                🗂️ Raw Route Data (Click to expand)
              </summary>
              <pre className="text-xs text-gray-600 mt-2 whitespace-pre-wrap overflow-auto max-h-60">
                {JSON.stringify(routeData, null, 2)}
              </pre>
            </details>
          </div>
        )}
      </div>
    </div>
  );
};

export default FlightRouteDebug;