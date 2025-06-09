// src/components/test/DebugSearchTest.jsx - Add this temporarily to debug
import React, { useState } from 'react';

const DebugSearchTest = () => {
  const [debugInfo, setDebugInfo] = useState('Click to test');
  const [loading, setLoading] = useState(false);

  const runDebugTest = () => {
    setLoading(true);
    setDebugInfo('Testing...');
    
    // Check Google Maps availability
    const checks = {
      windowGoogle: !!window.google,
      googleMaps: !!window.google?.maps,
      googlePlaces: !!window.google?.maps?.places,
      PlacesService: !!window.google?.maps?.places?.PlacesService,
      PlacesServiceStatus: !!window.google?.maps?.places?.PlacesServiceStatus
    };
    
    console.log('🔍 Debug checks:', checks);
    setDebugInfo(JSON.stringify(checks, null, 2));
    
    if (checks.PlacesService) {
      // Try actual search
      setTimeout(() => {
        try {
          const service = new window.google.maps.places.PlacesService(
            document.createElement('div')
          );
          
          const request = {
            location: new window.google.maps.LatLng(3.1390, 101.6869), // KL
            radius: 2000,
            keyword: 'restaurant'
          };
          
          console.log('🍽️ Testing restaurant search in KL...');
          
          service.nearbySearch(request, (results, status) => {
            console.log('📡 Search completed:', { status, results });
            
            const statusText = Object.keys(window.google.maps.places.PlacesServiceStatus)
              .find(key => window.google.maps.places.PlacesServiceStatus[key] === status);
            
            setDebugInfo(`Search Status: ${statusText} (${status})\nResults: ${results?.length || 0} places found`);
            setLoading(false);
          });
          
        } catch (error) {
          console.error('❌ Search test error:', error);
          setDebugInfo(`Error: ${error.message}`);
          setLoading(false);
        }
      }, 1000);
    } else {
      setLoading(false);
    }
  };

  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
      <h3 className="font-bold text-yellow-800 mb-2">🔧 Debug Search Test</h3>
      
      <button
        onClick={runDebugTest}
        disabled={loading}
        className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 disabled:bg-gray-400 mb-3"
      >
        {loading ? 'Testing...' : 'Test Places Search'}
      </button>
      
      <pre className="text-xs bg-white p-2 rounded border overflow-auto max-h-32">
        {debugInfo}
      </pre>
      
      <p className="text-xs text-yellow-700 mt-2">
        Open browser console (F12) to see detailed logs
      </p>
    </div>
  );
};

export default DebugSearchTest;