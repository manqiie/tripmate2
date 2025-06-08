// src/components/debug/MapsDebug.jsx - Temporary component for testing
import React, { useState, useEffect } from 'react';
import googleMapsService from '../../services/googleMaps';

const MapsDebug = () => {
  const [debugInfo, setDebugInfo] = useState({
    apiKey: null,
    apiKeyValid: null,
    mapsLoaded: false,
    error: null
  });

  useEffect(() => {
    testGoogleMapsSetup();
  }, []);

  const testGoogleMapsSetup = async () => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    
    setDebugInfo(prev => ({
      ...prev,
      apiKey: apiKey ? `${apiKey.substring(0, 8)}...` : 'Not found'
    }));

    try {
      // Test loading Google Maps
      await googleMapsService.loadGoogleMaps();
      setDebugInfo(prev => ({ ...prev, mapsLoaded: true }));

      // Test API key validity
      const validationResult = await googleMapsService.testApiKey();
      setDebugInfo(prev => ({ 
        ...prev, 
        apiKeyValid: validationResult.valid,
        error: validationResult.valid ? null : validationResult.message
      }));
    } catch (error) {
      setDebugInfo(prev => ({ 
        ...prev, 
        error: error.message 
      }));
    }
  };

  const testRoute = async () => {
    try {
      const result = await googleMapsService.calculateOptimizedRoute(
        'New York, NY',
        'Los Angeles, CA',
        ['Chicago, IL']
      );
      console.log('Test route result:', result);
      alert('Route calculation successful! Check console for details.');
    } catch (error) {
      console.error('Route test failed:', error);
      alert(`Route test failed: ${error.message}`);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
      <h3 className="text-xl font-bold text-gray-900 mb-4">🔧 Google Maps Debug Info</h3>
      
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="font-medium">Environment Variable:</span>
          <span className={`px-3 py-1 rounded text-sm ${
            debugInfo.apiKey !== 'Not found' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            {debugInfo.apiKey}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="font-medium">Google Maps Loaded:</span>
          <span className={`px-3 py-1 rounded text-sm ${
            debugInfo.mapsLoaded ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            {debugInfo.mapsLoaded ? '✓ Yes' : '✗ No'}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="font-medium">API Key Valid:</span>
          <span className={`px-3 py-1 rounded text-sm ${
            debugInfo.apiKeyValid === true ? 'bg-green-100 text-green-800' : 
            debugInfo.apiKeyValid === false ? 'bg-red-100 text-red-800' : 
            'bg-yellow-100 text-yellow-800'
          }`}>
            {debugInfo.apiKeyValid === true ? '✓ Valid' : 
             debugInfo.apiKeyValid === false ? '✗ Invalid' : 
             '⏳ Testing...'}
          </span>
        </div>

        {debugInfo.error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-red-800 font-medium">Error:</p>
            <p className="text-red-700 text-sm">{debugInfo.error}</p>
          </div>
        )}

        <div className="pt-3 border-t">
          <button
            onClick={testRoute}
            disabled={!debugInfo.mapsLoaded || debugInfo.apiKeyValid !== true}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            Test Route Calculation
          </button>
        </div>
      </div>

      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
        <h4 className="font-medium text-gray-800 mb-2">Setup Instructions:</h4>
        <ol className="text-sm text-gray-600 space-y-1">
          <li>1. Create <code className="bg-gray-200 px-1 rounded">.env</code> file in frontend root</li>
          <li>2. Add <code className="bg-gray-200 px-1 rounded">VITE_GOOGLE_MAPS_API_KEY=your_key</code></li>
          <li>3. Enable Maps JavaScript API in Google Cloud Console</li>
          <li>4. Enable Directions API in Google Cloud Console</li>
          <li>5. Restart your development server</li>
        </ol>
      </div>
    </div>
  );
};

export default MapsDebug;