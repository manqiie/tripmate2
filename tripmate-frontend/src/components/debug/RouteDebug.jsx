// src/components/debug/RouteDebug.jsx - Debug route data
import React, { useState } from 'react';
import googleMapsService from '../../services/googleMaps';

const RouteDebug = () => {
  const [routeData, setRouteData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const testRoute = async () => {
    setLoading(true);
    setError('');
    setRouteData(null);

    try {
      console.log('Testing route calculation...');
      
      const result = await googleMapsService.calculateOptimizedRoute(
        'Kuala Lumpur, Malaysia',
        'Penang, Malaysia',
        ['Ipoh, Malaysia']
      );

      console.log('Route result:', result);
      setRouteData(result);

    } catch (err) {
      console.error('Route test failed:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const inspectRouteStructure = () => {
    if (!routeData?.route) return null;

    const route = routeData.route;
    return {
      status: route.status || 'Unknown',
      hasRoutes: route.routes?.length > 0,
      routeCount: route.routes?.length || 0,
      firstRoute: route.routes?.[0] ? {
        hasLegs: !!route.routes[0].legs,
        legCount: route.routes[0].legs?.length || 0,
        hasBounds: !!route.routes[0].bounds,
        boundsInfo: route.routes[0].bounds ? 'Available' : 'Missing'
      } : null
    };
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
      <h3 className="text-xl font-bold text-gray-900 mb-4">🔍 Route Data Debug</h3>
      
      <div className="space-y-4">
        <button
          onClick={testRoute}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
        >
          {loading ? 'Testing Route...' : 'Test Route: KL → Ipoh → Penang'}
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
              <p className="text-green-800 font-medium">✅ Route Calculated Successfully!</p>
              <div className="mt-2 text-sm text-green-700">
                <p>Distance: {routeData.totalDistance} km</p>
                <p>Duration: {Math.floor(routeData.totalDuration / 60)}h {routeData.totalDuration % 60}m</p>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-blue-800 font-medium">📊 Route Structure Analysis:</p>
              <pre className="text-xs text-blue-700 mt-2 whitespace-pre-wrap">
                {JSON.stringify(inspectRouteStructure(), null, 2)}
              </pre>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-yellow-800 font-medium">🔧 Raw Route Object Keys:</p>
              <div className="text-xs text-yellow-700 mt-2">
                {routeData.route ? Object.keys(routeData.route).join(', ') : 'No route object'}
              </div>
            </div>

            {/* Show actual route data for debugging */}
            <details className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <summary className="text-gray-800 font-medium cursor-pointer">
                🗂️ Full Route Data (Click to expand)
              </summary>
              <pre className="text-xs text-gray-600 mt-2 whitespace-pre-wrap overflow-auto max-h-40">
                {JSON.stringify(routeData, null, 2)}
              </pre>
            </details>
          </div>
        )}
      </div>
    </div>
  );
};

export default RouteDebug;