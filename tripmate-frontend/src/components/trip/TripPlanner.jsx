// src/components/trip/TripPlanner.jsx - Enhanced version with better route optimization
import React, { useState, useEffect } from 'react';
import { MapPin, Calendar, Users, Plus, X, Route, Save, Clock, AlertCircle, CheckCircle } from 'lucide-react';
import GoogleMap from '../maps/GoogleMap';
import googleMapsService from '../../services/googleMaps';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';

const TripPlanner = () => {
  const { user } = useAuth();
  const [tripData, setTripData] = useState({
    title: '',
    startLocation: '',
    endLocation: '',
    startDate: '',
    endDate: '',
    travelers: 2,
    waypoints: []
  });
  
  const [route, setRoute] = useState(null);
  const [routeInfo, setRouteInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [apiKeyValid, setApiKeyValid] = useState(null);

  // Validate API key on component mount
  useEffect(() => {
    validateApiKey();
  }, []);

  const validateApiKey = async () => {
    try {
      const validation = await googleMapsService.validateApiKey();
      setApiKeyValid(validation.valid);
      if (!validation.valid) {
        setError(validation.message);
      }
    } catch (err) {
      setApiKeyValid(false);
      setError('Failed to validate Google Maps API key');
    }
  };

  const addWaypoint = () => {
    if (tripData.waypoints.length >= 8) {
      setError('Maximum 8 waypoints allowed for optimal performance');
      return;
    }
    
    setTripData({
      ...tripData,
      waypoints: [...tripData.waypoints, '']
    });
  };

  const removeWaypoint = (index) => {
    const newWaypoints = tripData.waypoints.filter((_, i) => i !== index);
    setTripData({ ...tripData, waypoints: newWaypoints });
    
    // Clear route if waypoints changed
    if (route) {
      setRoute(null);
      setRouteInfo(null);
    }
  };

  const updateWaypoint = (index, value) => {
    const newWaypoints = [...tripData.waypoints];
    newWaypoints[index] = value;
    setTripData({ ...tripData, waypoints: newWaypoints });
    
    // Clear route if waypoints changed
    if (route) {
      setRoute(null);
      setRouteInfo(null);
    }
  };

  const calculateDuration = () => {
    if (tripData.startDate && tripData.endDate) {
      const start = new Date(tripData.startDate);
      const end = new Date(tripData.endDate);
      const diffTime = Math.abs(end - start);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      return diffDays;
    }
    return 0;
  };

  const validateInputs = () => {
    if (!tripData.startLocation.trim()) {
      throw new Error('Please enter a start location');
    }
    if (!tripData.endLocation.trim()) {
      throw new Error('Please enter an end location');
    }
    if (tripData.startLocation.trim().toLowerCase() === tripData.endLocation.trim().toLowerCase()) {
      throw new Error('Start and end locations cannot be the same');
    }
  };

  const handlePlanTrip = async () => {
    setLoading(true);
    setError('');
    setRoute(null);
    setRouteInfo(null);

    try {
      validateInputs();

      if (!apiKeyValid) {
        throw new Error('Google Maps API key is not valid. Please check your configuration.');
      }

      const validWaypoints = tripData.waypoints
        .map(wp => wp.trim())
        .filter(wp => wp !== '');
      
      console.log('Planning trip with:', {
        start: tripData.startLocation,
        end: tripData.endLocation,
        waypoints: validWaypoints
      });

      const routeResult = await googleMapsService.calculateOptimizedRoute(
        tripData.startLocation.trim(),
        tripData.endLocation.trim(),
        validWaypoints
      );

      setRoute(routeResult.route);
      setRouteInfo({
        totalDistance: routeResult.totalDistance,
        totalDuration: routeResult.totalDuration,
        optimizedWaypoints: routeResult.optimizedWaypoints,
        coordinates: routeResult.coordinates,
        bounds: routeResult.bounds
      });

      // Show success message
      const waypointMessage = validWaypoints.length > 0 
        ? ` with ${validWaypoints.length} waypoint${validWaypoints.length === 1 ? '' : 's'}`
        : '';
      
      console.log(`Route calculated successfully${waypointMessage}!`);

    } catch (err) {
      console.error('Trip planning failed:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTrip = async () => {
    if (!user) {
      setError('Please login to save trips');
      return;
    }

    if (!tripData.title.trim()) {
      setError('Please enter a trip title');
      return;
    }

    if (!route) {
      setError('Please plan the route first');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const tripDataToSave = {
        title: tripData.title.trim(),
        start_location: tripData.startLocation.trim(),
        end_location: tripData.endLocation.trim(),
        start_date: tripData.startDate || null,
        end_date: tripData.endDate || null,
        travelers: tripData.travelers,
        waypoints: tripData.waypoints.filter(wp => wp.trim() !== ''),
        route_data: JSON.stringify(route),
        total_distance: routeInfo?.totalDistance || 0,
        total_duration: routeInfo?.totalDuration || 0
      };

      await api.post('/trips/', tripDataToSave);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save trip');
    } finally {
      setSaving(false);
    }
  };

  const clearRoute = () => {
    setRoute(null);
    setRouteInfo(null);
    setError('');
  };

  const resetForm = () => {
    setTripData({
      title: '',
      startLocation: '',
      endLocation: '',
      startDate: '',
      endDate: '',
      travelers: 2,
      waypoints: []
    });
    clearRoute();
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Trip Planning Form */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Plan Your Trip</h2>
          {route && (
            <div className="flex gap-2">
              <button
                onClick={clearRoute}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Clear Route
              </button>
              <button
                onClick={resetForm}
                className="px-4 py-2 text-red-600 border border-red-300 rounded-lg hover:bg-red-50"
              >
                Reset All
              </button>
            </div>
          )}
        </div>
        
        {/* API Key Status */}
        {apiKeyValid === false && (
          <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5" />
            <div>
              <p className="font-medium">Google Maps API Key Issue</p>
              <p className="text-sm">Please check your .env file and API key configuration.</p>
            </div>
          </div>
        )}

        {/* Success/Error Messages */}
        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            {error}
          </div>
        )}

        {saved && (
          <div className="bg-green-50 text-green-600 p-3 rounded-lg mb-4 flex items-center gap-2">
            <CheckCircle className="w-5 h-5" />
            Trip saved successfully!
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Trip Details */}
          <div className="space-y-4">
            {/* Trip Title */}
            {user && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Trip Title
                </label>
                <input
                  type="text"
                  value={tripData.title}
                  onChange={(e) => setTripData({ ...tripData, title: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter trip title (required to save)"
                  maxLength={200}
                />
              </div>
            )}

            {/* Start Location */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <MapPin className="w-4 h-4 inline mr-1" />
                Start Location *
              </label>
              <input
                type="text"
                value={tripData.startLocation}
                onChange={(e) => setTripData({ ...tripData, startLocation: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter starting location (e.g., New York, NY)"
                required
              />
            </div>

            {/* End Location */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <MapPin className="w-4 h-4 inline mr-1" />
                End Location *
              </label>
              <input
                type="text"
                value={tripData.endLocation}
                onChange={(e) => setTripData({ ...tripData, endLocation: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter destination (e.g., Los Angeles, CA)"
                required
              />
            </div>

            {/* Waypoints */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Waypoints (Optional) - {tripData.waypoints.length}/8
                </label>
                <button
                  type="button"
                  onClick={addWaypoint}
                  disabled={tripData.waypoints.length >= 8}
                  className="flex items-center gap-1 text-blue-600 hover:text-blue-700 text-sm disabled:text-gray-400 disabled:cursor-not-allowed"
                >
                  <Plus className="w-4 h-4" />
                  Add Waypoint
                </button>
              </div>
              
              {tripData.waypoints.length === 0 && (
                <p className="text-sm text-gray-500 italic mb-2">
                  Add waypoints to create stops along your route. The system will optimize the order for efficiency.
                </p>
              )}
              
              {tripData.waypoints.map((waypoint, index) => (
                <div key={index} className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={waypoint}
                    onChange={(e) => updateWaypoint(index, e.target.value)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder={`Stop ${index + 1} (e.g., Chicago, IL)`}
                  />
                  <button
                    type="button"
                    onClick={() => removeWaypoint(index)}
                    className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg"
                    title="Remove waypoint"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column - Date & Travel Info */}
          <div className="space-y-4">
            {/* Dates */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Calendar className="w-4 h-4 inline mr-1" />
                  Start Date
                </label>
                <input
                  type="date"
                  value={tripData.startDate}
                  onChange={(e) => setTripData({ ...tripData, startDate: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  value={tripData.endDate}
                  onChange={(e) => setTripData({ ...tripData, endDate: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min={tripData.startDate || new Date().toISOString().split('T')[0]}
                />
              </div>
            </div>

            {/* Duration Display */}
            {tripData.startDate && tripData.endDate && (
              <div className="bg-blue-50 p-3 rounded-lg">
                <p className="text-blue-800 font-medium">
                  Duration: {calculateDuration()} day{calculateDuration() === 1 ? '' : 's'}
                </p>
              </div>
            )}

            {/* Travelers */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Users className="w-4 h-4 inline mr-1" />
                Number of Travelers
              </label>
              <select
                value={tripData.travelers}
                onChange={(e) => setTripData({ ...tripData, travelers: parseInt(e.target.value) })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                  <option key={num} value={num}>
                    {num} {num === 1 ? 'Traveler' : 'Travelers'}
                  </option>
                ))}
              </select>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <button
                onClick={handlePlanTrip}
                disabled={loading || !tripData.startLocation || !tripData.endLocation || apiKeyValid === false}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Calculating Route...
                  </>
                ) : (
                  <>
                    <Route className="w-5 h-5" />
                    Plan Optimized Route
                  </>
                )}
              </button>

              {user && route && (
                <button
                  onClick={handleSaveTrip}
                  disabled={saving || !tripData.title.trim()}
                  className="w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 disabled:bg-green-400 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium"
                >
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      Saving Trip...
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5" />
                      Save Trip
                    </>
                  )}
                </button>
              )}

              {!user && route && (
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-2">Want to save this trip?</p>
                  <button
                    onClick={() => window.location.href = '/auth'}
                    className="text-blue-600 hover:text-blue-700 font-medium text-sm"
                  >
                    Sign in to save trips
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Route Information */}
      {routeInfo && (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <CheckCircle className="w-6 h-6 text-green-600" />
            Route Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Route className="w-5 h-5 text-blue-600" />
                <span className="font-medium text-blue-800">Distance</span>
              </div>
              <p className="text-2xl font-bold text-blue-900">{routeInfo.totalDistance} km</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-5 h-5 text-green-600" />
                <span className="font-medium text-green-800">Duration</span>
              </div>
              <p className="text-2xl font-bold text-green-900">
                {Math.floor(routeInfo.totalDuration / 60)}h {routeInfo.totalDuration % 60}m
              </p>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="w-5 h-5 text-purple-600" />
                <span className="font-medium text-purple-800">Total Stops</span>
              </div>
              <p className="text-2xl font-bold text-purple-900">
                {2 + tripData.waypoints.filter(wp => wp.trim() !== '').length}
              </p>
            </div>
            <div className="bg-orange-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-5 h-5 text-orange-600" />
                <span className="font-medium text-orange-800">Travelers</span>
              </div>
              <p className="text-2xl font-bold text-orange-900">
                {tripData.travelers}
              </p>
            </div>
          </div>

          {/* Optimized Waypoints Order */}
          {routeInfo.optimizedWaypoints && routeInfo.optimizedWaypoints.length > 0 && (
            <div className="mt-4 p-4 bg-yellow-50 rounded-lg">
              <h4 className="font-medium text-yellow-800 mb-2">Optimized Route Order:</h4>
              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1 bg-green-200 text-green-800 rounded-full text-sm">
                  Start: {tripData.startLocation}
                </span>
                {routeInfo.optimizedWaypoints.map((waypoint, index) => (
                  <span key={index} className="px-3 py-1 bg-blue-200 text-blue-800 rounded-full text-sm">
                    Stop {index + 1}: {waypoint}
                  </span>
                ))}
                <span className="px-3 py-1 bg-red-200 text-red-800 rounded-full text-sm">
                  End: {tripData.endLocation}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Map */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-4">Route Map</h3>
        <GoogleMap
          route={route}
          className="w-full h-96 rounded-lg"
          center={routeInfo?.coordinates?.[0] || { lat: 40.7128, lng: -74.0060 }}
          zoom={routeInfo ? 8 : 10}
        />
        {!route && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-50 rounded-lg">
            <div className="text-center text-gray-500">
              <MapPin className="w-12 h-12 mx-auto mb-2 text-gray-300" />
              <p>Plan your route to see it on the map</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TripPlanner;