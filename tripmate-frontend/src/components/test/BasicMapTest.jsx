// src/components/test/BasicMapTest.jsx - Create this file for testing
import React, { useEffect, useRef } from 'react';

const BasicMapTest = () => {
  const mapRef = useRef(null);

  useEffect(() => {
    // Get API key directly
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    console.log('API Key:', apiKey ? 'Found' : 'Not found');
    console.log('Map container:', mapRef.current);

    if (!apiKey) {
      console.error('No API key found');
      return;
    }

    // Simple script loading
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=geometry`;
    script.async = true;
    script.defer = true;

    script.onload = () => {
      console.log('Google Maps script loaded');
      console.log('window.google:', window.google);
      console.log('window.google.maps:', window.google?.maps);

      if (window.google && window.google.maps && mapRef.current) {
        try {
          console.log('Creating map...');
          const map = new window.google.maps.Map(mapRef.current, {
            center: { lat: 3.1390, lng: 101.6869 }, // Kuala Lumpur
            zoom: 10,
          });

          console.log('Map created:', map);

          // Add a simple marker
          const marker = new window.google.maps.Marker({
            position: { lat: 3.1390, lng: 101.6869 },
            map: map,
            title: 'Test Marker',
          });

          console.log('Marker added:', marker);
        } catch (error) {
          console.error('Error creating map:', error);
        }
      } else {
        console.error('Google Maps API not available or container not found');
      }
    };

    script.onerror = (error) => {
      console.error('Failed to load Google Maps script:', error);
    };

    document.head.appendChild(script);

    // Cleanup
    return () => {
      const existingScript = document.querySelector(`script[src*="maps.googleapis.com"]`);
      if (existingScript) {
        existingScript.remove();
      }
    };
  }, []);

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">🧪 Basic Map Test</h2>
      <div 
        ref={mapRef} 
        className="w-full h-96 border border-gray-300 rounded-lg bg-gray-100"
        style={{ 
          minHeight: '400px',
          backgroundColor: '#f0f0f0' // Visible background
        }}
      >
        <div className="flex items-center justify-center h-full text-gray-500">
          Map should appear here...
        </div>
      </div>
      
      <div className="mt-4 p-3 bg-gray-100 rounded text-sm">
        <p><strong>Debug:</strong> Check browser console (F12) for detailed logs</p>
        <p><strong>Expected:</strong> You should see a map of Kuala Lumpur with a marker</p>
      </div>
    </div>
  );
};

export default BasicMapTest;