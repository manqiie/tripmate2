// src/components/test/PlacesTest.jsx
import React, { useState } from 'react';
import placesService from '../../services/placesService';

const PlacesTest = () => {
  const [status, setStatus] = useState('');
  
  const testPlaces = async () => {
    try {
      const result = await placesService.testPlacesAPI();
      setStatus(result.available ? '✅ Places API Working!' : '❌ ' + result.message);
    } catch (error) {
      setStatus('❌ Error: ' + error.message);
    }
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Places API Test</h2>
      <button 
        onClick={testPlaces}
        className="px-4 py-2 bg-blue-600 text-white rounded"
      >
        Test Places API
      </button>
      <p className="mt-4">{status}</p>
    </div>
  );
};

export default PlacesTest;