          // src/components/trip/TripPlanner.jsx - FIXED VERSION
import React, { useState } from 'react';
import { MapPin, Calendar, Users, Plus, X, Route, Save, Clock } from 'lucide-react';
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
  
  // CHANGE: Store the complete route result, not just the route part
  const [routeResult, setRouteResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const addWaypoint = () => {
    setTripData({
      ...tripData,
      waypoints: [...tripData.waypoints, '']
    });
  };

  const removeWaypoint = (index) => {
    const newWaypoints = tripData.waypoints.filter((_, i) => i !== index);
    setTripData({ ...tripData, waypoints: newWaypoints });
  };

  const updateWaypoint = (index, value) => {
    const newWaypoints = [...tripData.waypoints];
    newWaypoints[index] = value;
    setTripData({ ...tripData, waypoints: newWaypoints });
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

  const handlePlanTrip = async () => {
    if (!tripData.startLocation || !tripData.endLocation) {
      setError('Please enter both start and end locations');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const validWaypoints = tripData.waypoints.filter(wp => wp.trim() !== '');
      
      // FIXED: Store the complete result
      const result = await googleMapsService.calculateOptimizedRoute(
        tripData.startLocation,
        tripData.endLocation,
        validWaypoints
      );

      console.log('Route calculation result:', result);
      
      // Store the complete result
      setRouteResult(result);
      
    } catch (err) {
      console.error('Route calculation error:', err);
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

    if (!routeResult?.route) {
      setError('Please plan the route first');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const tripDataToSave = {
        title: tripData.title,
        start_location: tripData.startLocation,
        end_location: tripData.endLocation,
        start_date: tripData.startDate,
        end_date: tripData.endDate,
        travelers: tripData.travelers,
        waypoints: tripData.waypoints.filter(wp => wp.trim() !== ''),
        route_data: JSON.stringify(routeResult.route),
        total_distance: routeResult?.totalDistance || 0,
        total_duration: routeResult?.totalDuration || 0
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

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Trip Planning Form */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Plan Your Trip</h2>
        
        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        {saved && (
          <div className="bg-green-50 text-green-600 p-3 rounded-lg mb-4">
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
                />
              </div>
            )}

            {/* Start Location */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <MapPin className="w-4 h-4 inline mr-1" />
                Start Location
              </label>
              <input
                type="text"
                value={tripData.startLocation}
                onChange={(e) => setTripData({ ...tripData, startLocation: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter starting location"
              />
            </div>

            {/* End Location */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <MapPin className="w-4 h-4 inline mr-1" />
                End Location
              </label>
              <input
                type="text"
                value={tripData.endLocation}
                onChange={(e) => setTripData({ ...tripData, endLocation: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter destination"
              />
            </div>

            {/* Waypoints */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Waypoints (Optional)
                </label>
                <button
                  type="button"
                  onClick={addWaypoint}
                  className="flex items-center gap-1 text-blue-600 hover:text-blue-700 text-sm"
                >
                  <Plus className="w-4 h-4" />
                  Add Waypoint
                </button>
              </div>
              {tripData.waypoints.map((waypoint, index) => (
                <div key={index} className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={waypoint}
                    onChange={(e) => updateWaypoint(index, e.target.value)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder={`Waypoint ${index + 1}`}
                  />
                  <button
                    type="button"
                    onClick={() => removeWaypoint(index)}
                    className="p-2 text-red-600 hover:text-red-700"
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
                />
              </div>
            </div>

            {/* Duration Display */}
            {tripData.startDate && tripData.endDate && (
              <div className="bg-blue-50 p-3 rounded-lg">
                <p className="text-blue-800 font-medium">
                  Duration: {calculateDuration()} days
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
                  <option key={num} value={num}>{num} {num === 1 ? 'Traveler' : 'Travelers'}</option>
                ))}
              </select>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <button
                onClick={handlePlanTrip}
                disabled={loading}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:bg-blue-400 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                ) : (
                  <>
                    <Route className="w-5 h-5" />
                    Plan Route
                  </>
                )}
              </button>

              {user && routeResult && (
                <button
                  onClick={handleSaveTrip}
                  disabled={saving}
                  className="w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 disabled:bg-green-400 flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  ) : (
                    <>
                      <Save className="w-5 h-5" />
                      Save Trip
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Route Information */}
      {routeResult && (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Route Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className={`p-4 rounded-lg ${routeResult.isFlightRoute ? 'bg-orange-50' : 'bg-blue-50'}`}>
              <div className="flex items-center gap-2">
                <Route className={`w-5 h-5 ${routeResult.isFlightRoute ? 'text-orange-600' : 'text-blue-600'}`} />
                <span className={`font-medium ${routeResult.isFlightRoute ? 'text-orange-800' : 'text-blue-800'}`}>
                  {routeResult.isFlightRoute ? 'Flight Distance' : 'Driving Distance'}
                </span>
              </div>
              <p className={`text-2xl font-bold ${routeResult.isFlightRoute ? 'text-orange-900' : 'text-blue-900'}`}>
                {routeResult.totalDistance} km
              </p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-green-600" />
                <span className="font-medium text-green-800">
                  {routeResult.isFlightRoute ? 'Flight Time' : 'Driving Time'}
                </span>
              </div>
              <p className="text-2xl font-bold text-green-900">
                {Math.floor(routeResult.totalDuration / 60)}h {routeResult.totalDuration % 60}m
              </p>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-purple-600" />
                <span className="font-medium text-purple-800">
                  {routeResult.isFlightRoute ? 'Airports' : 'Stops'}
                </span>
              </div>
              <p className="text-2xl font-bold text-purple-900">
                {2 + tripData.waypoints.filter(wp => wp.trim() !== '').length}
              </p>
            </div>
          </div>
          
          {/* Flight Route Notice */}
          {routeResult.isFlightRoute && (
            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start gap-3">
                <div className="text-yellow-600">✈️</div>
                <div>
                  <h4 className="font-medium text-yellow-800 mb-1">Flight Route Detected</h4>
                  <p className="text-sm text-yellow-700">
                    This route covers long distances across continents and requires air travel. 
                    The map shows flight paths as dotted lines with estimated flight times.
                  </p>
                  <p className="text-xs text-yellow-600 mt-2">
                    💡 Flight times are estimates based on commercial aviation speeds (~900 km/h)
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Map */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-4">Route Map</h3>
        <GoogleMap
          route={routeResult?.route}
          routeInfo={routeResult} // Pass the complete route info including flight status
          className="w-full h-96 rounded-lg"
        />
      </div>
    </div>
  );
};

export default TripPlanner;